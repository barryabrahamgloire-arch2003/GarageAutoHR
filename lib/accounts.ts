import type { Role } from "./types";

export type SpaceRole = Role | "superadmin";

export const DEMO_PASSWORD = "Atelier2026";
export const GARAGE_ID = "g_autohr";

export interface DemoAccount {
  id: string;
  email: string;
  name: string;
  role: SpaceRole;
  staffId: string | null;
  clientId: string | null;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: "acc_super", email: "iris.p@example.org", name: "Superadmin", role: "superadmin", staffId: null, clientId: null },
  { id: "acc_aissatou", email: "aissatou.diallo@autohr.co", name: "Aissatou Diallo", role: "reception", staffId: "s_aissatou", clientId: null },
  { id: "acc_mamadou", email: "mamadou.camara@autohr.co", name: "Mamadou Camara", role: "atelier", staffId: "s_mamadou", clientId: null },
  { id: "acc_fatou", email: "fatoumata.bah@autohr.co", name: "Fatoumata Bah", role: "atelier", staffId: "s_fatou", clientId: null },
  { id: "acc_ibrahima", email: "ibrahima.sow@autohr.co", name: "Ibrahima Sow", role: "comptabilite", staffId: "s_ibrahima", clientId: null },
  { id: "acc_mariama", email: "mariama.sylla@autohr.co", name: "Mariama Sylla", role: "achats", staffId: "s_mariama", clientId: null },
  { id: "acc_alpha", email: "alpha.barry@autohr.co", name: "Alpha Oumar Barry", role: "direction", staffId: "s_alpha", clientId: null },
  { id: "acc_transkipe", email: "transkipe@clients.autohr.co", name: "Société Trans-Kipé", role: "client", staffId: null, clientId: "c_transkipe" },
  { id: "acc_kadiatou", email: "kadiatou.bah@clients.autohr.co", name: "Kadiatou Bah", role: "client", staffId: null, clientId: "c_kadiatou" },
  { id: "acc_batiguinee", email: "batiguinee@clients.autohr.co", name: "Entreprise Bâti-Guinée", role: "client", staffId: null, clientId: "c_batiguinee" },
  { id: "acc_mohamed", email: "mohamed.toure@clients.autohr.co", name: "Mohamed Touré", role: "client", staffId: null, clientId: "c_mohamed" },
];

export function spaceLabel(role: SpaceRole) {
  switch (role) {
    case "superadmin":
      return "Superadmin";
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
