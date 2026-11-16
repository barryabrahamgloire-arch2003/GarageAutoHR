import type { Client, Status } from "./types";

export function gnf(value: number) {
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(value));
  return `${formatted} GNF`;
}

export function formatDay(iso: string) {
  if (!iso) return "";
  const value = iso.length === 10 ? `${iso}T12:00:00` : iso;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function formatWhen(iso: string) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function parseAmount(value: string) {
  const number = Number(value.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number);
}

export function today() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function clock() {
  return new Date().toTimeString().slice(0, 5);
}

export function clientLabel(client: Pick<Client, "name" | "company" | "kind">) {
  if (client.kind === "entreprise" && client.company) return client.company;
  return client.name;
}

export function whatsappHref(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export const STATUS_LABEL: Record<Status, string> = {
  recu: "Reçu",
  diagnostic: "Diagnostic",
  facture_prete: "Facture prête",
  paiement_effectue: "Paiement effectué",
  reparation_faite: "Réparation faite",
};

export const STATUS_HELP: Record<Status, string> = {
  recu: "Le véhicule vient d’arriver. L’atelier n’a pas encore rendu son diagnostic.",
  diagnostic: "Les pannes sont identifiées. La comptabilité prépare la facture et les achats.",
  facture_prete: "La facture est prête. La réparation attend le paiement de 70 %.",
  paiement_effectue: "L’acompte est reçu. L’atelier peut commencer la réparation.",
  reparation_faite: "Les travaux sont terminés.",
};

export const SECTIONS = ["Mécanique", "Électricité", "Carrosserie", "Climatisation", "Pneumatiques", "Diesel"];
