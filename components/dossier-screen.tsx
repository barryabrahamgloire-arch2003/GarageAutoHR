"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useGarage } from "@/components/garage-provider";
import { ReceptionEditor, ReportEditor, WorkshopEditor } from "@/components/forms";
import { Empty, PaperRow, SignatureView, StatusRail, WhatsApp } from "@/components/kit";
import { emptyWorkshop, liveInvoice, moneyOf, reportDraft } from "@/lib/domain";
import { formatDay, formatWhen, gnf, parseAmount, STATUS_HELP } from "@/lib/format";
import { byPost, clientOf } from "@/lib/selectors";
import { talkTo } from "@/lib/talk";
import type { Dossier, PartNeed } from "@/lib/types";

export function DossierScreen({ id }: { id: string }) {
  const garage = useGarage();
  const { state, role, clientId } = garage;
  if (!state) return null;
  const dossier = state.dossiers.find((item) => item.id === id);
  if (!dossier) return <Empty title="Introuvable" text="Ce dossier n’est plus dans le garage." />;
  if (role === "achats") {
    return <Empty title="Liste d’achats" text="Les achats ne montrent pas les dossiers, seulement la liste à acheter." action={<Link className="btn" href="/">Voir la liste</Link>} />;
  }
  const client = clientOf(state, dossier);
  if (role === "client" && dossier.clientId !== clientId) {
    return <Empty title="Autre client" text="Ce dossier n’est pas lié au client choisi." />;
  }
  if (!client) return <Empty title="Client manquant" text="Le dossier n’a pas de client." />;

  const talks = talkTo(state, dossier, role, garage.actorName);
  const billSource = liveInvoice(dossier, state.settings);
  const bill = dossier.parts.length || dossier.labor > 0 || dossier.invoice ? moneyOf(billSource, dossier.depositPaid) : null;
  const canEditReception = role === "reception" || role === "atelier";
  const canWorkshop = role === "atelier";
  const canMoney = role === "comptabilite" || role === "direction";
  const canReport = role === "atelier";

  return (
    <div className="rise grid gap-5">
      <header className="glass p-6 md:p-8">
        <p className="kicker">{dossier.number} · {client.company || client.name}</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="plate">{dossier.reception.plate}</h1>
            <p className="mt-2 text-lg">{dossier.reception.makeModel}</p>
            <p className="quiet">{dossier.reception.engine}{client.driver ? ` · Chauffeur ${client.driver}` : ""}</p>
          </div>
          <p className="max-w-sm text-sm">{STATUS_HELP[dossier.status]}</p>
        </div>
        <div className="mt-5">
          <StatusRail status={dossier.status} />
        </div>
      </header>

      {talks.length ? (
        <section className="no-print">
          <p className="kicker mb-2">Écrire sur WhatsApp</p>
          <div className="chips">
            {talks.map((talk) => (
              <WhatsApp key={`${talk.role}-${talk.name}`} talk={talk} />
            ))}
          </div>
        </section>
      ) : null}

      {bill ? <DepositBanner dossier={dossier} covered={bill.covered} due={bill.depositDue} paid={bill.paid} balance={bill.balance} canRecord={canMoney} /> : null}

      {role === "client" ? (
        <ClientView dossier={dossier} faults={dossier.reception.arrivalFaults} result={dossier.reception.diagnosticResult} />
      ) : (
        <>
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
          {(canMoney || dossier.invoice) ? <InvoiceBlock dossier={dossier} canMoney={canMoney} /> : null}
          <ReportBlock dossier={dossier} canEdit={canReport} />
          {(role === "direction" || role === "reception") ? <Meeting dossier={dossier} /> : null}
          <Journal dossier={dossier} />
        </>
      )}
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
    <section className="glass p-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-lg">{title}</h2>
        {action && !editing ? (
          <button className="btn-line" type="button" onClick={() => setEditing(true)}>Modifier</button>
        ) : null}
      </div>
      {editing ? (
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
      ) : (
        <div>{children}</div>
      )}
    </section>
  );
}

function WorkshopBlock({ dossier, canEdit }: { dossier: Dossier; canEdit: boolean }) {
  const { run, actorName, state } = useGarage();
  const [editing, setEditing] = useState(false);
  const sheet = dossier.workshop;
  const chef = state ? byPost(state, "Chef d’atelier")?.name ?? "" : "";
  return (
    <section className="glass p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg">Fiche d’atelier</h2>
        {canEdit && sheet && !editing ? (
          <button className="btn-line" type="button" onClick={() => setEditing(true)}>Modifier</button>
        ) : null}
      </div>
      {editing ? (
        <WorkshopEditor
          initial={sheet ?? emptyWorkshop(dossier, actorName, chef)}
          onCancel={() => setEditing(false)}
          onSubmit={async (next) => {
            const ok = await run({ type: "saveWorkshop", payload: { dossierId: dossier.id, sheet: next, actor: actorName } }, "Fiche d’atelier enregistrée");
            if (ok) setEditing(false);
          }}
        />
      ) : sheet ? (
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
        <div>
          <p className="quiet">La fiche d’atelier n’est pas encore ouverte.</p>
          {canEdit ? <button className="btn mt-3" type="button" onClick={() => setEditing(true)}>Remplir la fiche</button> : null}
        </div>
      )}
    </section>
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
    <section className="glass p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg">Éléments à traiter</h2>
        {canAdd && !frozen ? (
          <button className="btn-line" type="button" onClick={() => setOpen((value) => !value)}>Ajouter</button>
        ) : null}
      </div>
      <div className={`fold ${open ? "open" : ""}`}>
        <div>
          <form
            className="mb-4 grid gap-3 md:grid-cols-2"
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
            <button className="btn md:col-span-2" type="submit">Ajouter au dossier</button>
          </form>
        </div>
      </div>
      <div className="grid gap-3">
        {dossier.parts.length ? dossier.parts.map((part) => (
          <PartRow key={part.id} part={part} dossier={dossier} canMoney={canMoney} frozen={frozen} />
        )) : <p className="quiet">Aucune pièce relevée pour l’instant.</p>}
      </div>
    </section>
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
            {purchase ? ` · achat ${purchase.status === "a_valider" ? "à valider" : purchase.status === "a_acheter" ? "à acheter" : purchase.status === "achete" ? `acheté ${purchase.boughtPrice !== null ? gnf(purchase.boughtPrice) : ""}` : "refusé"}` : ""}
          </p>
        </div>
        <p>{part.unitPrice > 0 ? gnf(part.unitPrice) : "Prix à fixer"}</p>
      </div>
      {canMoney && !frozen ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <input className="field !w-36" inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value)} aria-label={`Prix de ${part.label}`} />
          <button className="btn-line" type="button" onClick={() => {
            const amount = parseAmount(price);
            if (amount === null) return;
            run({ type: "setPartPrice", payload: { dossierId: dossier.id, partId: part.id, unitPrice: amount, actor: actorName } }, "Prix enregistré");
          }}>Prix de vente</button>
          {product && !part.served ? (
            <button className="btn-line" type="button" onClick={() => run({ type: "serveFromStock", payload: { dossierId: dossier.id, partId: part.id, actor: actorName } }, "Sorti du stock")}>
              Prendre au stock
            </button>
          ) : null}
          {!part.served && !purchase ? (
            <button className="btn-line" type="button" onClick={() => setAsk((value) => !value)}>Demander l’achat</button>
          ) : null}
          {!part.served ? (
            <button className="btn-ghost" type="button" onClick={() => run({ type: "removePart", payload: { dossierId: dossier.id, partId: part.id, actor: actorName } }, "Pièce retirée")}>Retirer</button>
          ) : null}
        </div>
      ) : null}
      {purchase && role === "direction" && purchase.status === "a_valider" ? (
        <div className="mt-3 flex gap-2">
          <button className="btn" type="button" onClick={() => run({ type: "validatePurchase", payload: { purchaseId: purchase.id, actor: actorName } }, "Achat validé")}>Valider l’achat</button>
          <button className="btn-line" type="button" onClick={() => run({ type: "refusePurchase", payload: { purchaseId: purchase.id, actor: actorName } }, "Achat refusé")}>Refuser</button>
        </div>
      ) : null}
      <div className={`fold ${ask ? "open" : ""}`}>
        <div>
          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <input className="field" inputMode="numeric" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} aria-label="Prix maximum" placeholder="Prix max" />
            <input className="field" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} aria-label="Échéance" />
            <button className="btn" type="button" onClick={() => {
              const amount = parseAmount(maxPrice);
              if (amount === null) return;
              run({
                type: "requestPurchase",
                payload: { dossierId: dossier.id, partId: part.id, qty: part.qty, maxPrice: amount, deadline, actor: actorName },
              }, "Demande envoyée à la direction").then((ok) => { if (ok) setAsk(false); });
            }}>Envoyer</button>
          </div>
        </div>
      </div>
    </article>
  );
}

function InvoiceBlock({ dossier, canMoney }: { dossier: Dossier; canMoney: boolean }) {
  const { state, run, actorName } = useGarage();
  const [labor, setLabor] = useState(String(dossier.labor || ""));
  if (!state) return null;
  const invoice = liveInvoice(dossier, state.settings);
  const bill = moneyOf(invoice, dossier.depositPaid);
  const frozen = Boolean(dossier.invoice);
  return (
    <section className="glass p-6" id="facture">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">{invoice.number}</p>
          <h2 className="text-lg">Facture</h2>
        </div>
        <button className="btn-line no-print" type="button" onClick={() => window.print()}>Imprimer</button>
      </div>
      {invoice.lines.map((line) => (
        <div className="row" key={line.id}>
          <span>{line.qty} × {line.label}</span>
          <strong>{gnf(line.qty * line.unitPrice)}</strong>
        </div>
      ))}
      <div className="row"><span>Main-d’œuvre</span><strong>{gnf(invoice.labor)}</strong></div>
      <div className="row"><span>TVA {Math.round(invoice.vatRate * 100)} %</span><strong>{gnf(bill.tva)}</strong></div>
      <div className="row"><span>Total</span><strong>{gnf(bill.ttc)}</strong></div>
      <div className="row"><span>Acompte 70 %</span><strong>{gnf(bill.depositDue)}</strong></div>
      <div className="row"><span>Déjà reçu</span><strong>{gnf(bill.paid)}</strong></div>
      <div className="row"><span>Reste à payer</span><strong>{gnf(bill.balance)}</strong></div>
      {frozen ? <p className="hint mt-3">Facture figée le {formatWhen(dossier.invoice?.readyAt ?? "")}.</p> : null}
      {canMoney && !frozen ? (
        <div className="no-print mt-4 flex flex-wrap gap-2">
          <input className="field !w-40" inputMode="numeric" value={labor} onChange={(event) => setLabor(event.target.value)} aria-label="Main-d’œuvre" />
          <button className="btn-line" type="button" onClick={() => {
            const amount = parseAmount(labor);
            if (amount === null) return;
            run({ type: "setLabor", payload: { dossierId: dossier.id, labor: amount, actor: actorName } }, "Main-d’œuvre enregistrée");
          }}>Main-d’œuvre</button>
          <button className="btn" type="button" onClick={() => run({ type: "markInvoiceReady", payload: { dossierId: dossier.id, actor: actorName } }, "Facture prête")}>
            Rendre la facture prête
          </button>
        </div>
      ) : null}
      {canMoney && frozen && dossier.depositPaid === 0 && dossier.status !== "reparation_faite" ? (
        <button className="btn-ghost no-print mt-2" type="button" onClick={() => run({ type: "reopenInvoice", payload: { dossierId: dossier.id, actor: actorName } }, "Facture rouverte")}>
          Rouvrir la facture
        </button>
      ) : null}
    </section>
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
    <section className={`glass p-5 ${locked ? "" : ""}`}>
      <p className="text-sm">{locked ? "La réparation ne commence qu’après 70 % de la facture." : covered && dossier.status !== "reparation_faite" ? "Acompte reçu. L’atelier peut réparer." : "Paiement à jour."}</p>
      <p className="mt-1">Acompte {gnf(due)} · reçu {gnf(paid)} · reste {gnf(balance)}</p>
      {canRecord && balance > 0 && dossier.invoice ? (
        <button className="btn-line no-print mt-3" type="button" onClick={() => setOpen((value) => !value)}>Enregistrer un paiement</button>
      ) : null}
      <div className={`fold ${open ? "open" : ""}`}>
        <div>
          <div className="mt-3 flex flex-wrap gap-2">
            <input className="field !w-48" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Montant reçu" />
            <button className="btn" type="button" onClick={() => {
              const value = parseAmount(amount);
              if (value === null) return;
              run({ type: "recordDeposit", payload: { dossierId: dossier.id, amount: value, actor: actorName } }, "Paiement enregistré").then((ok) => {
                if (ok) setOpen(false);
              });
            }}>Encaisser</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportBlock({ dossier, canEdit }: { dossier: Dossier; canEdit: boolean }) {
  const { state, run, actorName } = useGarage();
  const [editing, setEditing] = useState(false);
  if (!state) return null;
  const report = dossier.report;
  const director = byPost(state, "Directeur technique")?.name ?? "";
  const payable = dossier.invoice ? moneyOf(dossier.invoice, dossier.depositPaid).covered : false;
  return (
    <section className="glass p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg">Rapport d’activité</h2>
        {canEdit && report && !editing ? <button className="btn-line" type="button" onClick={() => setEditing(true)}>Modifier</button> : null}
      </div>
      {editing ? (
        <ReportEditor
          initial={reportDraft(state, dossier, director)}
          onCancel={() => setEditing(false)}
          onSubmit={async (next) => {
            const ok = await run({ type: "saveReport", payload: { dossierId: dossier.id, report: next, actor: actorName } }, "Rapport enregistré");
            if (ok) setEditing(false);
          }}
        />
      ) : report ? (
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
        <div>
          <p className="quiet">Le rapport se remplit quand les travaux sont faits.</p>
          {canEdit ? <button className="btn-line mt-3" type="button" onClick={() => setEditing(true)}>Rédiger le rapport</button> : null}
        </div>
      )}
      {canEdit && dossier.status !== "reparation_faite" ? (
        <div className="no-print mt-4">
          <button
            className="btn"
            type="button"
            disabled={!payable || !dossier.report}
            onClick={() => run({ type: "finishRepair", payload: { dossierId: dossier.id, actor: actorName } }, "Réparation terminée")}
          >
            Clôturer la réparation
          </button>
          {!payable ? <p className="hint mt-2">Bloqué tant que les 70 % ne sont pas encaissés.</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function Meeting({ dossier }: { dossier: Dossier }) {
  const { run, actorName, role } = useGarage();
  const [open, setOpen] = useState(false);
  const clientName = dossier.reception.particulier || dossier.reception.company;
  const [text, setText] = useState(`Bonjour ${clientName}, le directeur technique du Garage Auto HR souhaite vous voir au sujet du ${dossier.reception.makeModel} ${dossier.reception.plate}. Quand pouvez-vous passer ?`);
  if (role !== "direction" && !dossier.notes.length) return null;
  return (
    <section className="glass no-print p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg">Voir le client</h2>
        {role === "direction" ? <button className="btn" type="button" onClick={() => setOpen((value) => !value)}>Demander à voir le client</button> : null}
      </div>
      <div className={`fold ${open ? "open" : ""}`}>
        <div>
          <textarea className="area mt-3" value={text} onChange={(event) => setText(event.target.value)} />
          <button className="btn mt-3" type="button" onClick={() => run({ type: "requestClientMeeting", payload: { dossierId: dossier.id, text, actor: actorName } }, "Demande notée").then((ok) => { if (ok) setOpen(false); })}>
            Noter la demande
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {dossier.notes.map((note) => (
          <p key={note.id} className="text-sm"><strong>{note.author}</strong> · {formatWhen(note.at)} — {note.text}</p>
        ))}
      </div>
    </section>
  );
}

function Journal({ dossier }: { dossier: Dossier }) {
  if (!dossier.events.length) return null;
  return (
    <section className="px-2">
      <p className="kicker mb-2">Journal</p>
      <ul className="grid gap-1">
        {dossier.events.slice(0, 8).map((event) => (
          <li key={event.id} className="quiet text-sm">{formatWhen(event.at)} · {event.actor} — {event.text}</li>
        ))}
      </ul>
    </section>
  );
}

function ClientView({ dossier, faults, result }: { dossier: Dossier; faults: string; result: string }) {
  const { state } = useGarage();
  if (!state || !dossier.invoice) {
    return (
      <section className="glass p-6">
        <p>{STATUS_HELP[dossier.status]}</p>
        <PaperRow label="Pannes signalées" value={faults} />
        {result ? <PaperRow label="Constat de l’atelier" value={result} /> : null}
      </section>
    );
  }
  const bill = moneyOf(dossier.invoice, dossier.depositPaid);
  return (
    <section className="glass p-6" id="facture">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg">Facture {dossier.invoice.number}</h2>
        <button className="btn-line no-print" type="button" onClick={() => window.print()}>Imprimer</button>
      </div>
      <PaperRow label="Pannes signalées" value={faults} />
      {dossier.invoice.lines.map((line) => (
        <div className="row" key={line.id}>
          <span>{line.qty} × {line.label}</span>
          <strong>{gnf(line.qty * line.unitPrice)}</strong>
        </div>
      ))}
      <div className="row"><span>Main-d’œuvre</span><strong>{gnf(dossier.invoice.labor)}</strong></div>
      <div className="row"><span>Total</span><strong>{gnf(bill.ttc)}</strong></div>
      <div className="row"><span>Acompte 70 %</span><strong>{gnf(bill.depositDue)}</strong></div>
      <div className="row"><span>Déjà reçu</span><strong>{gnf(bill.paid)}</strong></div>
      <div className="row"><span>Reste</span><strong>{gnf(bill.balance)}</strong></div>
      {!bill.covered ? <p className="mt-4">La réparation commencera après le paiement de {gnf(bill.depositRemaining)}.</p> : null}
    </section>
  );
}
