"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGarage } from "@/components/garage-provider";
import { Empty } from "@/components/kit";
import { gnf, parseAmount, STATUS_HELP, STATUS_LABEL } from "@/lib/format";
import { clientDossiers, nextAction, sortDossiers, titleOf } from "@/lib/selectors";
import { roleLabel } from "@/lib/talk";
import type { Dossier, Purchase } from "@/lib/types";

export function Desk() {
  const { state, role } = useGarage();
  if (!state) return null;
  if (role === "achats") return <Purchases />;
  if (role === "client") return <ClientDesk />;
  if (role === "direction") return <DirectionDesk />;

  const groups = groupsFor(role, state.dossiers);
  return (
    <div className="rise grid gap-8">
      <Header
        kicker={roleLabel(role)}
        title={role === "reception" ? "Les voitures du jour" : role === "atelier" ? "L’atelier" : "À chiffrer et à encaisser"}
        text={
          role === "reception"
            ? "Ouvrez l’ordre de réception. L’atelier prend le relais ensuite."
            : role === "atelier"
              ? "Diagnostiquez, puis réparez seulement après l’acompte de 70 %."
              : "Les pannes arrivent de l’atelier. Préparez la facture et les achats."
        }
        action={role === "reception" ? <Link className="btn" href="/nouveau">Nouvel ordre</Link> : role === "comptabilite" ? <Link className="btn" href="/grille">Grille et stock</Link> : null}
        stats={
          role === "reception"
            ? [
                { label: "En cours", value: state.dossiers.filter((item) => item.status !== "reparation_faite").length },
                { label: "Terminées", value: state.dossiers.filter((item) => item.status === "reparation_faite").length },
                { label: "Dossiers", value: state.dossiers.length },
              ]
            : role === "atelier"
              ? [
                  { label: "À diagnostiquer", value: state.dossiers.filter((item) => item.status === "recu").length },
                  { label: "Réparation autorisée", value: state.dossiers.filter((item) => item.status === "paiement_effectue").length },
                  { label: "En diagnostic", value: state.dossiers.filter((item) => item.status === "diagnostic" || item.status === "facture_prete").length },
                ]
              : [
                  { label: "Factures à préparer", value: state.dossiers.filter((item) => item.status === "diagnostic").length },
                  { label: "Acomptes à encaisser", value: state.dossiers.filter((item) => item.status === "facture_prete").length },
                  { label: "Statuts non publiés", value: state.dossiers.filter((item) => item.clientStatus !== item.status).length },
                ]
        }
      />
      {groups.map((group) => (
        <section key={group.title} className="grid gap-3">
          <h2 className="kicker">{group.title}</h2>
          {group.items.length ? (
            <div className="card-grid">
              {group.items.map((dossier) => (
                <CarCard key={dossier.id} dossier={dossier} />
              ))}
            </div>
          ) : (
            <p className="quiet">Rien dans cette file.</p>
          )}
        </section>
      ))}
    </div>
  );
}

function groupsFor(role: "reception" | "atelier" | "comptabilite", dossiers: Dossier[]) {
  if (role === "reception") {
    return [
      { title: "En cours", items: sortDossiers(dossiers.filter((item) => item.status !== "reparation_faite")) },
      { title: "Terminées", items: dossiers.filter((item) => item.status === "reparation_faite") },
    ];
  }
  if (role === "atelier") {
    return [
      { title: "À diagnostiquer", items: dossiers.filter((item) => item.status === "recu") },
      { title: "Réparation autorisée", items: dossiers.filter((item) => item.status === "paiement_effectue") },
      { title: "Diagnostic en cours", items: dossiers.filter((item) => item.status === "diagnostic" || item.status === "facture_prete") },
    ];
  }
  return [
    { title: "Facture à préparer", items: dossiers.filter((item) => item.status === "diagnostic") },
    { title: "Acompte à encaisser", items: dossiers.filter((item) => item.status === "facture_prete") },
    { title: "Réparations lancées", items: dossiers.filter((item) => item.status === "paiement_effectue") },
  ];
}

function Header({ kicker, title, text, action, stats }: { kicker: string; title: string; text: string; action?: ReactNode; stats?: { label: string; value: number }[] }) {
  return (
    <div className="grid gap-4">
      <header className="home-hero">
        <Image src="/logo.png" alt="Garage Auto HR" width={88} height={88} className="home-logo" />
        <div>
          <p className="kicker">{kicker}</p>
          <h1 className="mt-1">{title}</h1>
          <p className="quiet mt-2 max-w-xl">{text}</p>
        </div>
        {action ? <div className="home-action">{action}</div> : null}
      </header>
      {stats?.length ? (
        <div className="stat-grid">
          {stats.map((stat) => (
            <article key={stat.label} className="stat">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CarCard({ dossier }: { dossier: Dossier }) {
  const { state, role } = useGarage();
  if (!state) return null;
  const title = titleOf(state, dossier);
  return (
    <Link href={`/dossier/${dossier.id}`} className="car">
      <span className={role === "client" && !dossier.clientStatus ? "badge wait" : "badge"}>
        {role === "client" ? (dossier.clientStatus ? STATUS_LABEL[dossier.clientStatus] : "Statut non publié") : STATUS_LABEL[dossier.status]}
      </span>
      <p className="plate">{title.plate}</p>
      <p>{title.model}</p>
      <p className="text-sm">{title.client}</p>
      <p className="mt-auto text-sm text-[#16181c]">
        {role === "client"
          ? (dossier.clientStatus ? STATUS_HELP[dossier.clientStatus] : "La comptabilité n’a pas encore publié le statut.")
          : nextAction(dossier)}
      </p>
    </Link>
  );
}

function ClientDesk() {
  const { state, clientId } = useGarage();
  if (!state) return null;
  const dossiers = clientDossiers(state, clientId);
  const client = state.clients.find((item) => item.id === clientId);
  return (
    <div className="rise grid gap-6">
      <Header
        kicker="Client"
        title={client?.company || client?.name || "Mes voitures"}
        text="Vous voyez seulement le statut publié par la comptabilité."
        stats={[
          { label: "Voitures", value: dossiers.length },
          { label: "Statut publié", value: dossiers.filter((item) => item.clientStatus).length },
          { label: "En attente", value: dossiers.filter((item) => !item.clientStatus).length },
        ]}
      />
      <div className="card-grid">
        {dossiers.map((dossier) => (
          <CarCard key={dossier.id} dossier={dossier} />
        ))}
      </div>
      {!dossiers.length ? <Empty title="Aucune voiture" text="Aucune voiture n’est ouverte pour ce client." /> : null}
    </div>
  );
}

function DirectionDesk() {
  const { state, run, actorName } = useGarage();
  if (!state) return null;
  const pending = state.purchases.filter((item) => item.status === "a_valider");
  return (
    <div className="rise grid gap-8">
      <Header
        kicker="Direction"
        title="Tous les dossiers"
        text="Ouvrez une voiture pour voir le client, la réception, les pannes, les solutions et les achats."
        stats={[
          { label: "Dossiers", value: state.dossiers.length },
          { label: "Achats à valider", value: pending.length },
          { label: "Réparations faites", value: state.dossiers.filter((item) => item.status === "reparation_faite").length },
        ]}
      />
      <section className="grid gap-3">
        <h2 className="kicker">Achats à valider</h2>
        {pending.length ? pending.map((purchase) => <PurchaseDecision key={purchase.id} purchase={purchase} actor={actorName} run={run} />) : <p className="quiet">Aucun achat en attente de validation.</p>}
      </section>
      <section className="card-grid">
        {sortDossiers(state.dossiers).map((dossier) => (
          <CarCard key={dossier.id} dossier={dossier} />
        ))}
      </section>
    </div>
  );
}

function PurchaseDecision({
  purchase,
  actor,
  run,
}: {
  purchase: Purchase;
  actor: string;
  run: ReturnType<typeof useGarage>["run"];
}) {
  return (
    <article className="glass flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <strong>{purchase.label}</strong>
        <p className="quiet text-sm">
          {purchase.plate} · {purchase.qty} · max {gnf(purchase.maxPrice)} · avant le {purchase.deadline}
        </p>
      </div>
      <div className="flex gap-2">
        <button className="btn" type="button" onClick={() => run({ type: "validatePurchase", payload: { purchaseId: purchase.id, actor } }, "Achat validé")}>
          Valider
        </button>
        <button className="btn-line" type="button" onClick={() => run({ type: "refusePurchase", payload: { purchaseId: purchase.id, actor } }, "Achat refusé")}>
          Refuser
        </button>
      </div>
    </article>
  );
}

function Purchases() {
  const { state, run, actorName } = useGarage();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (!state) return null;
  const open = state.purchases.filter((item) => item.status === "a_acheter");
  const done = state.purchases.filter((item) => item.status === "achete");
  const compta = state.staff.find((person) => person.role === "comptabilite");
  const direction = state.staff.find((person) => person.role === "direction");

  return (
    <div className="rise grid gap-8">
      <Header
        kicker="Achats"
        title="Liste à acheter"
        text="Seulement les pièces validées : quantité, prix maximum et échéance. Indiquez le prix obtenu."
        stats={[
          { label: "À acheter", value: open.length },
          { label: "Déjà acheté", value: done.length },
          { label: "En attente de validation", value: state.purchases.filter((item) => item.status === "a_valider").length },
        ]}
        action={
          <div className="flex gap-2">
            {compta ? <a className="btn-wa" href={`https://wa.me/${compta.phone.replace(/\D/g, "")}?text=${encodeURIComponent("Bonjour, au sujet des achats du garage.")}`}>Compta</a> : null}
            {direction ? <a className="btn-line" href={`https://wa.me/${direction.phone.replace(/\D/g, "")}?text=${encodeURIComponent("Bonjour, au sujet d’un prix d’achat.")}`}>Direction</a> : null}
          </div>
        }
      />
      <div className="grid gap-3">
        {open.length ? open.map((purchase) => {
          const raw = prices[purchase.id] ?? "";
          const amount = parseAmount(raw);
          const over = amount !== null && amount > purchase.maxPrice;
          return (
            <article key={purchase.id} className="glass grid gap-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl">{purchase.label}</h2>
                  <p className="quiet text-sm">{purchase.reference || "Sans référence"} · {purchase.plate} · qté {purchase.qty}</p>
                </div>
                <div className="text-right">
                  <p className="kicker">Prix max</p>
                  <p className="plate text-[1.6rem]">{gnf(purchase.maxPrice)}</p>
                  <p className="quiet text-sm">Avant le {purchase.deadline}</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <label className="grid gap-1.5">
                  <span className="label">Prix obtenu</span>
                  <input className="field" inputMode="numeric" value={raw} onChange={(event) => setPrices((current) => ({ ...current, [purchase.id]: event.target.value }))} />
                </label>
                <label className="grid gap-1.5">
                  <span className="label">Où, ou note</span>
                  <input className="field" value={notes[purchase.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [purchase.id]: event.target.value }))} />
                </label>
                <button
                  className="btn self-end"
                  type="button"
                  onClick={() => {
                    if (amount === null) return;
                    run(
                      { type: "buyPurchase", payload: { purchaseId: purchase.id, price: amount, note: notes[purchase.id] ?? "", actor: actorName } },
                      "Achat enregistré",
                    );
                  }}
                >
                  J’ai acheté
                </button>
              </div>
              {over ? <p className="text-sm text-[#8d3a32]">Ce prix dépasse le maximum validé. La direction le verra.</p> : null}
            </article>
          );
        }) : <p className="quiet">Aucun achat en attente. Quand la direction valide une demande, elle apparaît ici.</p>}
      </div>
      {done.length ? (
        <section className="grid gap-2">
          <h2 className="kicker">Déjà acheté</h2>
          {done.map((purchase) => (
            <p key={purchase.id} className="quiet text-sm">
              {purchase.label} · {purchase.plate} · obtenu {purchase.boughtPrice !== null ? gnf(purchase.boughtPrice) : "—"}
              {purchase.supplierNote ? ` · ${purchase.supplierNote}` : ""}
            </p>
          ))}
        </section>
      ) : null}
    </div>
  );
}
