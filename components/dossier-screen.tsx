"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useGarage } from "@/components/garage-provider";
import { ReceptionEditor, ReportEditor, WorkshopEditor } from "@/components/forms";
import { Empty, PaperRow, Section, SignatureView, StatusMark, StatusRail, WhatsAppList } from "@/components/kit";
import { MotionIcon } from "@/components/motion-icon";
import { Money } from "@/components/figures";
import { Popup } from "@/components/popup";
import pencil from "@iconify-icons/line-md/pencil";
import plus from "@iconify-icons/line-md/plus";
import checkAll from "@iconify-icons/line-md/check-all";
import closeIcon from "@iconify-icons/line-md/close";
import trash from "@iconify-icons/line-md/trash";
import backup from "@iconify-icons/line-md/backup-restore";
import account from "@iconify-icons/line-md/account";
import download from "@iconify-icons/line-md/download";
import arrowLeft from "@iconify-icons/line-md/arrow-left";
import { emptyWorkshop, liveInvoice, moneyOf, reportDraft } from "@/lib/domain";
import { formatDay, formatWhen, parseAmount, STATUS_HELP, STATUS_LABEL } from "@/lib/format";
import { keepPhoto } from "@/lib/photo";
import { byPost, clientOf } from "@/lib/selectors";
import { talkTo } from "@/lib/talk";
import { STATUSES, type Dossier, type PartNeed } from "@/lib/types";

export function DossierScreen({ id }: { id: string }) {
  const garage = useGarage();
  const { state, role, clientId } = garage;
  if (!state) return null;
  const dossier = state.dossiers.find((item) => item.id === id);
  if (!dossier) return <Empty title="Introuvable" text="Ce dossier n’est plus dans le garage." />;
  if (role === "achats") {
    return <Empty title="Liste d’achats" text="Les achats ne montrent pas les dossiers, seulement la liste à acheter." action={<Link className="btn" href="/"><MotionIcon icon={arrowLeft} /><span>Voir la liste</span></Link>} />;
  }
  const client = clientOf(state, dossier);
  if (role === "client" && dossier.clientId !== clientId) {
    return <Empty title="Autre client" text="Ce dossier n’est pas lié au client choisi." />;
  }
  if (!client) return <Empty title="Client manquant" text="Le dossier n’a pas de client." />;

  const talks = talkTo(state, dossier, role, garage.actorName);
  const photo = keepPhoto(dossier.photo);
  const shownStatus = role === "client" ? dossier.clientStatus : dossier.status;
  const billSource = liveInvoice(dossier, state.settings);
  const bill = dossier.parts.length || dossier.labor > 0 || dossier.invoice ? moneyOf(billSource, dossier.depositPaid) : null;
  const canEditReception = role === "reception" || role === "atelier";
  const canWorkshop = role === "atelier";
  const canMoney = role === "comptabilite" || role === "direction";
  const canReport = role === "atelier";

  return (
    <div className="grid gap-5">
      <header className="glass dossier-head p-6 md:p-8">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="dossier-photo" src={photo} alt={`Photo ${dossier.reception.plate}`} />
        ) : null}
        <div>
        <p className="kicker">{dossier.number} · {client.company || client.name}</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="plate">{dossier.reception.plate}</h1>
            <p className="mt-2 text-lg">{dossier.reception.makeModel}</p>
            <p className="quiet">{dossier.reception.engine}{client.driver ? ` · Chauffeur ${client.driver}` : ""}</p>
          </div>
          <div className="grid max-w-sm justify-items-start gap-2">
            <StatusMark status={shownStatus} label={shownStatus ? STATUS_LABEL[shownStatus] : "Statut non publié"} />
            <p className="text-sm">
              {role === "client"
                ? (dossier.clientStatus ? STATUS_HELP[dossier.clientStatus] : "La comptabilité n’a pas encore publié le statut de cette voiture.")
                : STATUS_HELP[dossier.status]}
            </p>
          </div>
        </div>
        <div className="mt-5">
          {role === "client" ? (
            dossier.clientStatus ? <StatusRail status={dossier.clientStatus} /> : null
          ) : (
            <StatusRail status={dossier.status} />
          )}
        </div>
        </div>
      </header>
      {role === "client" ? null : (<>

      <WhatsAppList talks={talks} />

      {role === "atelier" && (dossier.status === "diagnostic" || dossier.status === "facture_prete") ? (
        <p className="glass p-5 text-sm">La réparation attend le règlement confirmé par la comptabilité.</p>
      ) : null}
      {role === "atelier" && dossier.status === "paiement_effectue" ? (
        <p className="glass p-5 text-sm">Le règlement est confirmé. La réparation peut commencer.</p>
      ) : null}
      {canMoney && bill ? <DepositBanner dossier={dossier} covered={bill.covered} due={bill.depositDue} paid={bill.paid} balance={bill.balance} canRecord={canMoney} /> : null}

          <PublishStatus dossier={dossier} />
          <DirectionComments dossier={dossier} />
          <Sheet title="Ordre de réception" action={canEditReception ? "reception" : undefined} dossier={dossier}>
            <PaperRow label="Date d’ouverture" value={formatDay(dossier.reception.openedAt)} />
            <PaperRow label="Immatriculation" value={dossier.reception.plate} />
            <PaperRow label="Réceptionniste" value={dossier.reception.receptionist} />
            <PaperRow label="Particulier" value={dossier.reception.particulier} />
            <PaperRow label="Moteur" value={dossier.reception.engine} />
            <PaperRow label="Téléphone" value={dossier.reception.phone} />
            <PaperRow label="Entreprise" value={dossier.reception.company} />
            <PaperRow label="Chauffeur" value={dossier.reception.driver} />
            <PaperRow label="Marque / modèle" value={dossier.reception.makeModel} />
            <PaperRow label="Pannes à l’arrivée" value={dossier.reception.arrivalFaults} />
            <PaperRow label="Diagnostic atelier" value={dossier.reception.diagnosticResult} />
            <PaperRow label="Date du diagnostic" value={formatDay(dossier.reception.diagnosticDate)} />
            <PaperRow label="Section" value={dossier.reception.section} />
            <PaperRow label="Intervenant" value={dossier.reception.intervenant} />
            <PaperRow label="Observation" value={dossier.reception.observation} />
            <PaperRow label="Fin des travaux" value={formatDay(dossier.reception.workEndDate)} />
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <p className="hint">Responsable</p>
                <SignatureView name={dossier.reception.managerName} image={dossier.reception.managerSignature} />
              </div>
              <div>
                <p className="hint">Client</p>
                <SignatureView name={dossier.reception.clientSigner} image={dossier.reception.clientSignature} />
              </div>
            </div>
          </Sheet>

          <WorkshopBlock dossier={dossier} canEdit={canWorkshop} />
          <PartsBlock dossier={dossier} canAdd={canWorkshop} canMoney={canMoney} />
          {canMoney ? <InvoiceBlock dossier={dossier} canMoney={canMoney} /> : null}
          <ReportBlock dossier={dossier} canEdit={canReport} />
          {(role === "direction" || role === "reception") ? <Meeting dossier={dossier} /> : null}
          <Journal dossier={dossier} />
        </>)}
    </div>
  );
}

function Sheet({
  title,
  children,
  action,
  dossier,
}: {
  title: string;
  children: ReactNode;
  action?: "reception";
  dossier: Dossier;
}) {
  const { run, actorName } = useGarage();
  const [editing, setEditing] = useState(false);
  return (
    <Section title={title} startOpen extra={action ? <button className="btn-line" type="button" onClick={() => setEditing(true)}><MotionIcon icon={pencil} /><span>Modifier</span></button> : undefined}>
      <div>{children}</div>
      <Popup open={editing} title="Ordre de réception" onClose={() => setEditing(false)}>
        <ReceptionEditor
          initial={dossier.reception}
          includeDiagnostic
          submitLabel="Enregistrer l’ordre"
          onCancel={() => setEditing(false)}
          onSubmit={async (order) => {
            const ok = order.diagnosticResult.trim()
              ? await run({ type: "saveDiagnostic", payload: { dossierId: dossier.id, order, actor: actorName } }, "Diagnostic enregistré")
              : await run({ type: "updateReception", payload: { dossierId: dossier.id, order, actor: actorName } }, "Ordre enregistré");
            if (ok) setEditing(false);
          }}
        />
      </Popup>
    </Section>
  );
}

function WorkshopBlock({ dossier, canEdit }: { dossier: Dossier; canEdit: boolean }) {
  const { run, actorName, state } = useGarage();
  const [editing, setEditing] = useState(false);
  const sheet = dossier.workshop;
  const chef = state ? byPost(state, "Chef d’atelier")?.name ?? "" : "";
  return (
    <Section title="Fiche d’atelier" extra={canEdit ? <button className="btn-line" type="button" onClick={() => setEditing(true)}><MotionIcon icon={pencil} /><span>{sheet ? "Modifier" : "Remplir"}</span></button> : undefined}>
      <Popup open={editing} title="Fiche d’atelier" onClose={() => setEditing(false)}>
        <WorkshopEditor
          initial={sheet ?? emptyWorkshop(dossier, actorName, chef)}
          onCancel={() => setEditing(false)}
          onSubmit={async (next) => {
            const ok = await run({ type: "saveWorkshop", payload: { dossierId: dossier.id, sheet: next, actor: actorName } }, "Fiche d’atelier enregistrée");
            if (ok) setEditing(false);
          }}
        />
      </Popup>
      {sheet ? (
        <div>
          <PaperRow label="Début" value={`${formatDay(sheet.startDate)} ${sheet.startTime}`.trim()} />
          <PaperRow label="Fin" value={`${formatDay(sheet.endDate)} ${sheet.endTime}`.trim()} />
          <PaperRow label="Marque / modèle" value={sheet.makeModel} />
          <PaperRow label="Section" value={sheet.section} />
          <PaperRow label="Immatriculation" value={sheet.plate} />
          <PaperRow label="Compteur fin" value={sheet.odometerEnd} />
          {sheet.tasks.map((task) => (
            <PaperRow key={task.id} label={formatDay(task.date) || "Travaux"} value={[task.work, task.reference, task.observation].filter(Boolean).join(" · ")} />
          ))}
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <p className="hint">Intervenant</p>
              <SignatureView name={sheet.intervenant} image={sheet.intervenantSignature} />
            </div>
            <div>
              <p className="hint">Chef d’atelier</p>
              <SignatureView name={sheet.chef} image={sheet.chefSignature} />
            </div>
          </div>
        </div>
      ) : (
        <p className="quiet">La fiche d’atelier n’est pas encore ouverte.</p>
      )}
    </Section>
  );
}

function PartsBlock({ dossier, canAdd, canMoney }: { dossier: Dossier; canAdd: boolean; canMoney: boolean }) {
  const { state, run, actorName } = useGarage();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [constat, setConstat] = useState("");
  if (!state) return null;
  const frozen = Boolean(dossier.invoice);

  return (
    <Section title="Éléments à traiter" extra={canAdd && !frozen ? <button className="btn-line" type="button" onClick={() => setOpen(true)}><MotionIcon icon={plus} /><span>Ajouter</span></button> : undefined}>
      <Popup open={open} title="Ajouter une pièce" onClose={() => setOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const product = state.products.find((item) => item.id === productId);
            run({
              type: "addPart",
              payload: {
                dossierId: dossier.id,
                productId,
                label: label || product?.name || "",
                reference: product?.reference ?? "",
                qty: Number(qty),
                constat,
                actor: actorName,
              },
            }, "Pièce ajoutée").then((ok) => {
              if (!ok) return;
              setLabel("");
              setConstat("");
              setOpen(false);
            });
          }}
        >
          <label className="grid gap-1.5">
            <span className="label">Produit de la grille</span>
            <select className="field" value={productId} onChange={(event) => {
              setProductId(event.target.value);
              const product = state.products.find((item) => item.id === event.target.value);
              if (product) setLabel(product.name);
            }}>
              <option value="">Hors grille</option>
              {state.products.map((product) => (
                <option key={product.id} value={product.id}>{product.name} · stock {product.stock}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="label">Désignation</span>
            <input className="field" value={label} onChange={(event) => setLabel(event.target.value)} />
          </label>
          <label className="grid gap-1.5">
            <span className="label">Quantité</span>
            <input className="field" inputMode="numeric" value={qty} onChange={(event) => setQty(event.target.value)} />
          </label>
          <label className="grid gap-1.5">
            <span className="label">Constat</span>
            <input className="field" value={constat} onChange={(event) => setConstat(event.target.value)} />
          </label>
          <button className="btn" type="submit"><MotionIcon icon={plus} /><span>Ajouter au dossier</span></button>
        </form>
      </Popup>
      <div className="grid gap-3">
        {dossier.parts.length ? dossier.parts.map((part) => (
          <PartRow key={part.id} part={part} dossier={dossier} canMoney={canMoney} frozen={frozen} />
        )) : <p className="quiet">Aucune pièce relevée pour l’instant.</p>}
      </div>
    </Section>
  );
}

function PartRow({ part, dossier, canMoney, frozen }: { part: PartNeed; dossier: Dossier; canMoney: boolean; frozen: boolean }) {
  const { state, run, actorName, role } = useGarage();
  const [price, setPrice] = useState(String(part.unitPrice || ""));
  const [maxPrice, setMaxPrice] = useState(String(part.unitPrice || ""));
  const [deadline, setDeadline] = useState("");
  const [ask, setAsk] = useState(false);
  if (!state) return null;
  const product = state.products.find((item) => item.id === part.productId);
  const purchase = state.purchases.find((item) => item.partId === part.id && item.status !== "refuse");

  return (
    <article className="rounded-2xl bg-white/45 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <strong>{part.label}</strong>
          <p className="quiet text-sm">{part.qty} × {part.reference || "sans réf."}{part.constat ? ` · ${part.constat}` : ""}</p>
          <p className="mt-1 text-sm">
            {part.served ? "Servi du stock" : product ? `Stock ${product.stock}` : "Hors grille"}
            {purchase ? ` · achat ${purchase.status === "a_valider" ? "à valider" : purchase.status === "a_acheter" ? "à acheter" : purchase.status === "achete" ? "acheté" : "refusé"}` : ""}
          </p>
        </div>
        {canMoney ? <p>{part.unitPrice > 0 ? <Money value={part.unitPrice} /> : "Prix à fixer"}</p> : null}
      </div>
      {canMoney && !frozen ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <input className="field !w-36" inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value)} aria-label={`Prix de ${part.label}`} />
          <button className="btn-line" type="button" onClick={() => {
            const amount = parseAmount(price);
            if (amount === null) return;
            run({ type: "setPartPrice", payload: { dossierId: dossier.id, partId: part.id, unitPrice: amount, actor: actorName } }, "Prix enregistré");
          }}><MotionIcon icon={pencil} /><span>Prix de vente</span></button>
          {product && !part.served ? (
            <button className="btn-line" type="button" onClick={() => run({ type: "serveFromStock", payload: { dossierId: dossier.id, partId: part.id, actor: actorName } }, "Sorti du stock")}>
              <MotionIcon icon={download} /><span>Prendre au stock</span>
            </button>
          ) : null}
          {!part.served && !purchase ? (
            <button className="btn-line" type="button" onClick={() => setAsk(true)}><MotionIcon icon={plus} /><span>Demander l’achat</span></button>
          ) : null}
          {!part.served ? (
            <button className="btn-ghost" type="button" onClick={() => run({ type: "removePart", payload: { dossierId: dossier.id, partId: part.id, actor: actorName } }, "Pièce retirée")}><MotionIcon icon={trash} /><span>Retirer</span></button>
          ) : null}
        </div>
      ) : null}
      {purchase && role === "direction" && purchase.status === "a_valider" ? (
        <div className="mt-3 flex gap-2">
          <button className="btn" type="button" onClick={() => run({ type: "validatePurchase", payload: { purchaseId: purchase.id, actor: actorName } }, "Achat validé")}><MotionIcon icon={checkAll} /><span>Valider l’achat</span></button>
          <button className="btn-line" type="button" onClick={() => run({ type: "refusePurchase", payload: { purchaseId: purchase.id, actor: actorName } }, "Achat refusé")}><MotionIcon icon={closeIcon} /><span>Refuser</span></button>
        </div>
      ) : null}
      <Popup open={ask} title="Demander l’achat" onClose={() => setAsk(false)}>
        <div className="grid gap-3">
          <input className="field" inputMode="numeric" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} aria-label="Prix maximum" placeholder="Prix max" />
          <input className="field" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} aria-label="Échéance" />
          <button className="btn" type="button" onClick={() => {
            const amount = parseAmount(maxPrice);
            if (amount === null) return;
            run({
              type: "requestPurchase",
              payload: { dossierId: dossier.id, partId: part.id, qty: part.qty, maxPrice: amount, deadline, actor: actorName },
            }, "Demande envoyée à la direction").then((ok) => { if (ok) setAsk(false); });
          }}><MotionIcon icon={checkAll} /><span>Envoyer</span></button>
        </div>
      </Popup>
    </article>
  );
}

function InvoiceBlock({ dossier, canMoney }: { dossier: Dossier; canMoney: boolean }) {
  const { state, run, actorName } = useGarage();
  const [labor, setLabor] = useState(String(dossier.labor || ""));
  const [laborOpen, setLaborOpen] = useState(false);
  if (!state) return null;
  const invoice = liveInvoice(dossier, state.settings);
  const bill = moneyOf(invoice, dossier.depositPaid);
  const frozen = Boolean(dossier.invoice);
  return (
    <Section title={`Facture ${invoice.number}`} extra={<button className="btn-line no-print" type="button" onClick={() => window.print()}><MotionIcon icon={download} /><span>Imprimer</span></button>}>
      {invoice.lines.map((line) => (
        <div className="row" key={line.id}>
          <span>{line.qty} × {line.label}</span>
          <strong><Money value={line.qty * line.unitPrice} /></strong>
        </div>
      ))}
      <div className="row"><span>Main-d’œuvre</span><strong><Money value={invoice.labor} /></strong></div>
      <div className="row"><span>TVA {Math.round(invoice.vatRate * 100)} %</span><strong><Money value={bill.tva} /></strong></div>
      <div className="row"><span>Total</span><strong><Money value={bill.ttc} /></strong></div>
      <div className="row"><span>Acompte 70 %</span><strong><Money value={bill.depositDue} /></strong></div>
      <div className="row"><span>Déjà reçu</span><strong><Money value={bill.paid} /></strong></div>
      <div className="row"><span>Reste à payer</span><strong><Money value={bill.balance} /></strong></div>
      {frozen ? <p className="hint mt-3">Facture figée le {formatWhen(dossier.invoice?.readyAt ?? "")}.</p> : null}
      {canMoney && !frozen ? (
        <div className="no-print mt-4 flex flex-wrap gap-2">
          <button className="btn-line" type="button" onClick={() => setLaborOpen(true)}><MotionIcon icon={pencil} /><span>Main-d’œuvre</span></button>
          <button className="btn" type="button" onClick={() => run({ type: "markInvoiceReady", payload: { dossierId: dossier.id, actor: actorName } }, "Facture prête")}>
            <MotionIcon icon={checkAll} /><span>Rendre la facture prête</span>
          </button>
        </div>
      ) : null}
      <Popup open={laborOpen} title="Main-d’œuvre" onClose={() => setLaborOpen(false)}>
        <div className="grid gap-3">
          <input className="field" inputMode="numeric" value={labor} onChange={(event) => setLabor(event.target.value)} aria-label="Main-d’œuvre" />
          <button className="btn" type="button" onClick={() => {
            const amount = parseAmount(labor);
            if (amount === null) return;
            run({ type: "setLabor", payload: { dossierId: dossier.id, labor: amount, actor: actorName } }, "Main-d’œuvre enregistrée").then((ok) => {
              if (ok) setLaborOpen(false);
            });
          }}><MotionIcon icon={checkAll} /><span>Enregistrer</span></button>
        </div>
      </Popup>
      {canMoney && frozen && dossier.depositPaid === 0 && dossier.status !== "reparation_faite" ? (
        <button className="btn-ghost no-print mt-2" type="button" onClick={() => run({ type: "reopenInvoice", payload: { dossierId: dossier.id, actor: actorName } }, "Facture rouverte")}>
          <MotionIcon icon={backup} /><span>Rouvrir la facture</span>
        </button>
      ) : null}
    </Section>
  );
}

function DepositBanner({
  dossier,
  covered,
  due,
  paid,
  balance,
  canRecord,
}: {
  dossier: Dossier;
  covered: boolean;
  due: number;
  paid: number;
  balance: number;
  canRecord: boolean;
}) {
  const { run, actorName } = useGarage();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(Math.max(due - paid, 0)));
  const locked = dossier.status !== "reparation_faite" && !covered;
  return (
    <Section
      title="Règlement"
      startOpen
      extra={canRecord && balance > 0 && dossier.invoice ? <button className="btn-line no-print" type="button" onClick={() => setOpen(true)}><MotionIcon icon={checkAll} /><span>Encaisser</span></button> : undefined}
    >
      <p className="text-sm">{locked ? "La réparation ne commence qu’après 70 % de la facture." : covered && dossier.status !== "reparation_faite" ? "Acompte reçu. L’atelier peut réparer." : "Paiement à jour."}</p>
      <p className="mt-1">Acompte <Money value={due} /> · reçu <Money value={paid} /> · reste <Money value={balance} /></p>
      <Popup open={open} title="Encaisser" onClose={() => setOpen(false)}>
        <div className="grid gap-3">
          <input className="field" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Montant reçu" />
          <button className="btn" type="button" onClick={() => {
            const value = parseAmount(amount);
            if (value === null) return;
            run({ type: "recordDeposit", payload: { dossierId: dossier.id, amount: value, actor: actorName } }, "Paiement enregistré").then((ok) => {
              if (ok) setOpen(false);
            });
          }}><MotionIcon icon={checkAll} /><span>Encaisser</span></button>
        </div>
      </Popup>
    </Section>
  );
}

function ReportBlock({ dossier, canEdit }: { dossier: Dossier; canEdit: boolean }) {
  const { state, run, actorName } = useGarage();
  const [editing, setEditing] = useState(false);
  if (!state) return null;
  const report = dossier.report;
  const director = byPost(state, "Directeur technique")?.name ?? "";
  const payable = dossier.status === "paiement_effectue" || dossier.status === "reparation_faite" || (dossier.invoice ? moneyOf(dossier.invoice, dossier.depositPaid).covered : false);
  return (
    <Section title="Rapport d’activité" extra={canEdit ? <button className="btn-line" type="button" onClick={() => setEditing(true)}><MotionIcon icon={pencil} /><span>{report ? "Modifier" : "Rédiger"}</span></button> : undefined}>
      <Popup open={editing} title="Rapport d’activité" onClose={() => setEditing(false)}>
        <ReportEditor
          initial={reportDraft(state, dossier, director)}
          onCancel={() => setEditing(false)}
          onSubmit={async (next) => {
            const ok = await run({ type: "saveReport", payload: { dossierId: dossier.id, report: next, actor: actorName } }, "Rapport enregistré");
            if (ok) setEditing(false);
          }}
        />
      </Popup>
      {report ? (
        <div>
          <PaperRow label="Immatriculation" value={report.plate} />
          <PaperRow label="Marque / modèle" value={report.makeModel} />
          <PaperRow label="Kms" value={report.kms} />
          <PaperRow label="Client" value={report.clientName} />
          <PaperRow label="Entrée" value={formatDay(report.entryDate)} />
          <PaperRow label="Sortie" value={formatDay(report.exitDate)} />
          <PaperRow label="Téléphone" value={report.phone} />
          <PaperRow label="Chauffeur" value={report.driver} />
          <PaperRow label="Pannes" value={report.faults} />
          <PaperRow label="Travaux et pièces" value={report.workAndParts} />
          <PaperRow label="Observation" value={report.observation} />
          <PaperRow label="Chef d’atelier" value={`${report.chef} · ${formatDay(report.date)} ${report.time}`.trim()} />
          <PaperRow label="Directeur technique" value={report.director} />
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <p className="hint">Chef d’atelier</p>
              <SignatureView name={report.chef} image={report.chefSignature} />
            </div>
            <div>
              <p className="hint">Client</p>
              <SignatureView name={report.clientSigner} image={report.clientSignature} />
            </div>
            <div>
              <p className="hint">Directeur technique</p>
              <SignatureView name={report.director} image={report.directorSignature} />
            </div>
          </div>
        </div>
      ) : (
        <p className="quiet">Le rapport se remplit quand les travaux sont faits.</p>
      )}
      {canEdit && dossier.status !== "reparation_faite" ? (
        <div className="no-print mt-4">
          <button
            className="btn"
            type="button"
            disabled={!payable || !dossier.report}
            onClick={() => run({ type: "finishRepair", payload: { dossierId: dossier.id, actor: actorName } }, "Réparation terminée")}
          >
            <MotionIcon icon={checkAll} /><span>Clôturer la réparation</span>
          </button>
          {!payable ? <p className="hint mt-2">Bloqué tant que la comptabilité n’a pas confirmé le règlement.</p> : null}
        </div>
      ) : null}
    </Section>
  );
}

function Meeting({ dossier }: { dossier: Dossier }) {
  const { run, actorName, role } = useGarage();
  const [open, setOpen] = useState(false);
  const clientName = dossier.reception.particulier || dossier.reception.company;
  const [text, setText] = useState(`Bonjour ${clientName}, le directeur technique du Garage Auto HR souhaite vous voir au sujet du ${dossier.reception.makeModel} ${dossier.reception.plate}. Quand pouvez-vous passer ?`);
  if (role !== "direction" && !dossier.notes.length) return null;
  return (
    <Section className="no-print" title="Voir le client" extra={role === "direction" ? <button className="btn" type="button" onClick={() => setOpen(true)}><MotionIcon icon={account} /><span>Demander</span></button> : undefined}>
      <Popup open={open} title="Voir le client" onClose={() => setOpen(false)}>
        <textarea className="area" value={text} onChange={(event) => setText(event.target.value)} />
        <button className="btn mt-3" type="button" onClick={() => run({ type: "requestClientMeeting", payload: { dossierId: dossier.id, text, actor: actorName } }, "Demande notée").then((ok) => { if (ok) setOpen(false); })}>
          <MotionIcon icon={checkAll} /><span>Noter la demande</span>
        </button>
      </Popup>
      <div className="mt-3 grid gap-2">
        {dossier.notes.filter((note) => note.kind === "voir_client").map((note) => (
          <p key={note.id} className="text-sm"><strong>{note.author}</strong> · {formatWhen(note.at)} — {note.text}</p>
        ))}
      </div>
    </Section>
  );
}

function Journal({ dossier }: { dossier: Dossier }) {
  if (!dossier.events.length) return null;
  return (
    <Section title="Journal">
      <ul className="grid gap-1">
        {dossier.events.slice(0, 8).map((event) => (
          <li key={event.id} className="quiet text-sm">{formatWhen(event.at)} · {event.actor} — {event.text}</li>
        ))}
      </ul>
    </Section>
  );
}

function PublishStatus({ dossier }: { dossier: Dossier }) {
  const { role, run, actorName } = useGarage();
  if (role !== "comptabilite") return null;
  return (
    <Section title="Statut visible par le client" startOpen>
      <p className="quiet text-sm">Seul ce bouton met à jour ce que le client voit. Tant qu’il n’est pas publié, le client ne voit pas de statut.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {STATUSES.map((status) => (
          <button
            key={status}
            className={dossier.clientStatus === status ? "btn" : "btn-line"}
            type="button"
            onClick={() => run({ type: "setClientStatus", payload: { dossierId: dossier.id, status, actor: actorName } }, "Statut publié au client")}
          >
            <MotionIcon icon={checkAll} />
            <span>{STATUS_LABEL[status]}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

function DirectionComments({ dossier }: { dossier: Dossier }) {
  const { role, run, actorName } = useGarage();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const comments = dossier.notes.filter((note) => note.kind === "commentaire");
  return (
    <Section title="Commentaires de la direction" extra={role === "direction" ? <button className="btn-line" type="button" onClick={() => setOpen(true)}><MotionIcon icon={pencil} /><span>Écrire</span></button> : undefined}>
      <Popup open={open} title="Commentaire" onClose={() => setOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            run({ type: "addComment", payload: { dossierId: dossier.id, text, actor: actorName } }, "Commentaire ajouté").then((ok) => {
              if (ok) {
                setText("");
                setOpen(false);
              }
            });
          }}
        >
          <textarea className="area" value={text} onChange={(event) => setText(event.target.value)} placeholder="Commentaire sur ce dossier" />
          <button className="btn" type="submit" disabled={!text.trim()}><MotionIcon icon={checkAll} /><span>Publier le commentaire</span></button>
        </form>
      </Popup>
      {role === "direction" ? null : (
        <p className="quiet mt-1 text-sm">Lisibles par l’équipe. Seule la direction les écrit.</p>
      )}
      <div className="mt-4 grid gap-2">
        {comments.length ? comments.map((note) => (
          <p key={note.id} className="text-sm"><strong>{note.author}</strong> · {formatWhen(note.at)} — {note.text}</p>
        )) : <p className="quiet text-sm">Aucun commentaire.</p>}
      </div>
    </Section>
  );
}
