import { moneyOf } from "./domain";
import { clientLabel } from "./format";
import type { Dossier, Role, State, Status } from "./types";

export function clientOf(state: State, dossier: Dossier) {
  return state.clients.find((client) => client.id === dossier.clientId);
}

export function people(state: State, role: Exclude<Role, "client">) {
  return state.staff.filter((person) => person.role === role);
}

export function byPost(state: State, post: string) {
  return state.staff.find((person) => person.post === post);
}

export function badgeFor(state: State, role: Role) {
  if (role === "reception") return state.dossiers.filter((item) => item.status === "recu").length;
  if (role === "atelier") {
    return state.dossiers.filter((item) => item.status === "recu" || item.status === "paiement_effectue").length;
  }
  if (role === "comptabilite") {
    return state.dossiers.filter((item) => item.status === "diagnostic" || item.status === "facture_prete").length;
  }
  if (role === "achats") return state.purchases.filter((item) => item.status === "a_acheter").length;
  if (role === "direction") return state.purchases.filter((item) => item.status === "a_valider").length;
  return 0;
}

export function clientDossiers(state: State, clientId: string) {
  return state.dossiers.filter((item) => item.clientId === clientId);
}

const RANK: Record<Status, number> = {
  recu: 0,
  diagnostic: 1,
  facture_prete: 2,
  paiement_effectue: 3,
  reparation_faite: 4,
};

export function sortDossiers(list: Dossier[]) {
  return list.slice().sort((a, b) => RANK[a.status] - RANK[b.status] || b.updatedAt.localeCompare(a.updatedAt));
}

export function nextAction(dossier: Dossier) {
  if (dossier.status === "recu") return "À diagnostiquer";
  if (dossier.status === "diagnostic") {
    if (dossier.parts.some((part) => part.unitPrice <= 0)) return "Pièces à chiffrer";
    return "Facture à préparer";
  }
  if (dossier.status === "facture_prete") return "Acompte de 70 % à encaisser";
  if (dossier.status === "paiement_effectue") return "Réparation à lancer";
  return "Travaux terminés";
}

export function billOf(state: State, dossier: Dossier) {
  if (!dossier.invoice && !dossier.parts.length && dossier.labor <= 0) return null;
  const invoice = dossier.invoice ?? {
    number: `FAC-${dossier.number}`,
    lines: dossier.parts.map((part) => ({ id: part.id, label: part.label, qty: part.qty, unitPrice: part.unitPrice })),
    labor: dossier.labor,
    vatRate: state.settings.vat,
    depositRate: state.settings.depositRate,
    readyAt: "",
  };
  return { invoice, money: moneyOf(invoice, dossier.depositPaid), frozen: Boolean(dossier.invoice) };
}

export function titleOf(state: State, dossier: Dossier) {
  const client = clientOf(state, dossier);
  return {
    plate: dossier.reception.plate,
    model: dossier.reception.makeModel,
    client: client ? clientLabel(client) : "Client",
    phone: client?.phone ?? dossier.reception.phone,
  };
}
