import { DEMO_ACCOUNTS, DEMO_PASSWORD, GARAGE_ID, type SpaceRole } from "./accounts";
import { hashPassword } from "./passwords";
import { createSeed } from "./seed";
import type { Action, Role, State } from "./types";

export interface Account {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: SpaceRole;
  garageId: string | null;
  staffId: string | null;
  clientId: string | null;
  active: boolean;
}

export interface GarageWorkspace {
  id: string;
  name: string;
  slug: string;
  state: State;
}

export interface OnlineRequest {
  id: string;
  kind: "client" | "fournisseur";
  name: string;
  phone: string;
  email: string;
  subject: string;
  vehicle: string;
  category: string;
  message: string;
  createdAt: string;
  seenAt: string | null;
}

export interface Platform {
  version: 4;
  garages: GarageWorkspace[];
  accounts: Account[];
  onlineRequests: OnlineRequest[];
}

export interface PublicAccount {
  id: string;
  email: string;
  name: string;
  role: SpaceRole;
  garageId: string | null;
  staffId: string | null;
  clientId: string | null;
  active: boolean;
}

const PERMISSIONS: Record<Action["type"], readonly Role[]> = {
  openReception: ["reception", "atelier"],
  updateReception: ["reception", "atelier"],
  saveDiagnostic: ["reception", "atelier"],
  saveWorkshop: ["atelier"],
  addPart: ["atelier"],
  setPartPrice: ["comptabilite", "direction"],
  removePart: ["atelier", "comptabilite"],
  setLabor: ["comptabilite", "direction"],
  serveFromStock: ["atelier", "comptabilite"],
  requestPurchase: ["comptabilite"],
  validatePurchase: ["direction"],
  refusePurchase: ["direction"],
  buyPurchase: ["achats"],
  markInvoiceReady: ["comptabilite"],
  reopenInvoice: ["comptabilite", "direction"],
  recordDeposit: ["comptabilite"],
  saveReport: ["atelier"],
  finishRepair: ["atelier"],
  requestClientMeeting: ["direction"],
  addComment: ["direction"],
  setClientStatus: ["comptabilite"],
  saveProduct: ["comptabilite", "direction"],
};

export function canPerform(role: SpaceRole, type: Action["type"]) {
  return (PERMISSIONS[type] as readonly SpaceRole[]).includes(role);
}

export function stampActor(action: Action, actor: string): Action {
  return { ...action, payload: { ...action.payload, actor } } as Action;
}

export function publicAccount(account: Account): PublicAccount {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
    garageId: account.garageId,
    staffId: account.staffId,
    clientId: account.clientId,
    active: account.active,
  };
}

export function demoAccounts(garageId: string): Account[] {
  return DEMO_ACCOUNTS.map((account) => ({
    id: account.id,
    email: account.email,
    name: account.name,
    passwordHash: hashPassword(DEMO_PASSWORD),
    role: account.role,
    garageId: account.role === "superadmin" ? null : garageId,
    staffId: account.staffId,
    clientId: account.clientId,
    active: true,
  }));
}

export function createPlatform(): Platform {
  const state = createSeed();
  return {
    version: 4,
    garages: [{ id: GARAGE_ID, name: state.settings.name, slug: "auto-hr", state }],
    accounts: demoAccounts(GARAGE_ID),
    onlineRequests: [],
  };
}

export function emptyGarageState(name: string, city: string, phone: string): State {
  return {
    version: 3,
    settings: {
      name,
      city,
      phone,
      address: city,
      hours: "Lun–Sam 8h–18h",
      laborRate: 150000,
      vat: 0.18,
      depositRate: 0.7,
    },
    staff: [],
    clients: [],
    vehicles: [],
    products: [],
    dossiers: [],
    purchases: [],
  };
}

export function slugify(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "garage";
}

export function visibleState(state: State, account: Account): State {
  if (account.role !== "client" || !account.clientId) return state;
  const clientId = account.clientId;
  return {
    ...state,
    staff: [],
    products: [],
    purchases: [],
    clients: state.clients.filter((client) => client.id === clientId),
    vehicles: state.vehicles.filter((vehicle) => vehicle.clientId === clientId),
    dossiers: state.dossiers
      .filter((dossier) => dossier.clientId === clientId)
      .map((dossier) => ({
        ...dossier,
        parts: [],
        labor: 0,
        invoice: null,
        depositPaid: 0,
        notes: [],
        events: [],
        workshop: null,
        report: null,
        reception: {
          ...dossier.reception,
          arrivalFaults: "",
          diagnosticResult: "",
          observation: "",
          managerSignature: "",
          clientSignature: "",
        },
      })),
  };
}

export function normalizeState(state: State): State {
  return {
    ...state,
    version: 3,
    dossiers: state.dossiers.map((dossier) => ({
      ...dossier,
      clientStatus: dossier.clientStatus === undefined ? dossier.status : dossier.clientStatus,
      notes: (dossier.notes ?? []).map((note) => ({ ...note, kind: note.kind ?? "note" })),
    })),
  };
}
