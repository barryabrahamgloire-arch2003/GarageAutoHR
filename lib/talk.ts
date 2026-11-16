import { clientLabel } from "./format";
import { byPost, clientOf } from "./selectors";
import type { Dossier, Role, State } from "./types";

export interface Talk {
  name: string;
  phone: string;
  role: string;
  text: string;
}

function line(name: string, phone: string, role: string, text: string): Talk | null {
  if (!phone.trim()) return null;
  return { name, phone, role, text };
}

export function talkTo(state: State, dossier: Dossier, role: Role, actor: string): Talk[] {
  const client = clientOf(state, dossier);
  const plate = dossier.reception.plate;
  const model = dossier.reception.makeModel;
  const subject = `Bonjour, Garage Auto HR — ${model} ${plate}, dossier ${dossier.number}.`;
  const chef = byPost(state, "Chef d’atelier");
  const comptable = byPost(state, "Comptable");
  const achats = byPost(state, "Responsable des achats");
  const directeur = byPost(state, "Directeur technique");
  const reception = state.staff.find((person) => person.name === dossier.reception.receptionist) ?? byPost(state, "Réceptionniste");
  const talks: Array<Talk | null> = [];

  if (client && role !== "client") {
    talks.push(line(clientLabel(client), client.phone, client.kind === "entreprise" ? "Client" : "Particulier", `${subject}`));
    if (dossier.reception.driver) {
      talks.push(
        line(
          dossier.reception.driver,
          client.phone,
          "Chauffeur",
          `Bonjour ${dossier.reception.driver}, message du Garage Auto HR pour le ${model} ${plate} (dossier ${dossier.number}).`,
        ),
      );
    }
  }
  if (role !== "reception" && reception) {
    talks.push(line(reception.name, reception.phone, reception.post, `${subject} Message depuis ${roleLabel(role)}.`));
  }
  if (role !== "atelier" && chef) {
    talks.push(line(chef.name, chef.phone, chef.post, `${subject} Pour l’atelier.`));
  }
  if (role !== "comptabilite" && comptable) {
    talks.push(line(comptable.name, comptable.phone, comptable.post, `${subject} Pour la comptabilité.`));
  }
  if (role !== "achats" && achats && role !== "client") {
    talks.push(line(achats.name, achats.phone, "Achats", `${subject} Pour les achats.`));
  }
  if (role !== "direction" && directeur) {
    talks.push(line(directeur.name, directeur.phone, directeur.post, `${subject} Pour la direction.`));
  }
  if (role === "client") {
    return [reception, comptable, directeur]
      .filter((person): person is NonNullable<typeof person> => Boolean(person))
      .map((person) => ({
        name: person.name,
        phone: person.phone,
        role: person.post,
        text: `Bonjour ${person.name}, je vous contacte pour mon ${model} ${plate}, dossier ${dossier.number}.`,
      }));
  }
  return talks.filter((item): item is Talk => Boolean(item)).filter((item) => item.name !== actor);
}

export function roleLabel(role: Role) {
  switch (role) {
    case "reception":
      return "Réception";
    case "atelier":
      return "Atelier";
    case "comptabilite":
      return "Comptabilité";
    case "achats":
      return "Achats";
    case "direction":
      return "Direction";
    case "client":
      return "Client";
  }
}
