export const ROLES = [
  "reception",
  "atelier",
  "comptabilite",
  "achats",
  "direction",
  "client",
] as const;

export type Role = (typeof ROLES)[number];

export const STATUSES = [
  "recu",
  "diagnostic",
  "facture_prete",
  "paiement_effectue",
  "reparation_faite",
] as const;

export type Status = (typeof STATUSES)[number];

export type PurchaseStatus = "a_valider" | "a_acheter" | "achete" | "refuse";

export interface Settings {
  name: string;
  city: string;
  phone: string;
  address: string;
  hours: string;
  laborRate: number;
  vat: number;
  depositRate: number;
}

export interface Staff {
  id: string;
  name: string;
  role: Exclude<Role, "client">;
  post: string;
  phone: string;
}

export interface Client {
  id: string;
  kind: "particulier" | "entreprise";
  name: string;
  phone: string;
  company: string;
  driver: string;
}

export interface Vehicle {
  id: string;
  clientId: string;
  plate: string;
  makeModel: string;
  engine: string;
}

export interface Product {
  id: string;
  name: string;
  reference: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
}

export interface ReceptionOrder {
  openedAt: string;
  plate: string;
  receptionist: string;
  particulier: string;
  engine: string;
  phone: string;
  company: string;
  driver: string;
  makeModel: string;
  arrivalFaults: string;
  diagnosticResult: string;
  diagnosticDate: string;
  section: string;
  intervenant: string;
  observation: string;
  workEndDate: string;
  managerName: string;
  managerSignature: string;
  clientSigner: string;
  clientSignature: string;
}

export interface WorkshopTask {
  id: string;
  date: string;
  work: string;
  reference: string;
  observation: string;
}

export interface WorkshopSheet {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  makeModel: string;
  section: string;
  plate: string;
  odometerEnd: string;
  tasks: WorkshopTask[];
  intervenant: string;
  intervenantSignature: string;
  chef: string;
  chefSignature: string;
}

export interface ActivityReport {
  plate: string;
  makeModel: string;
  kms: string;
  clientName: string;
  entryDate: string;
  exitDate: string;
  phone: string;
  driver: string;
  faults: string;
  workAndParts: string;
  observation: string;
  chef: string;
  date: string;
  time: string;
  chefSignature: string;
  clientSigner: string;
  clientSignature: string;
  director: string;
  directorSignature: string;
}

export interface PartNeed {
  id: string;
  productId: string;
  label: string;
  reference: string;
  qty: number;
  constat: string;
  unitPrice: number;
  served: boolean;
}

export interface Purchase {
  id: string;
  dossierId: string;
  partId: string;
  label: string;
  reference: string;
  plate: string;
  qty: number;
  maxPrice: number;
  deadline: string;
  status: PurchaseStatus;
  askedBy: string;
  validatedBy: string;
  boughtPrice: number | null;
  boughtAt: string;
  supplierNote: string;
}

export interface InvoiceLine {
  id: string;
  label: string;
  qty: number;
  unitPrice: number;
}

export interface Invoice {
  number: string;
  lines: InvoiceLine[];
  labor: number;
  vatRate: number;
  depositRate: number;
  readyAt: string;
}

export interface Note {
  id: string;
  at: string;
  author: string;
  text: string;
  kind: "note" | "voir_client";
}

export interface JournalEvent {
  id: string;
  at: string;
  actor: string;
  text: string;
}

export interface Dossier {
  id: string;
  number: string;
  status: Status;
  clientId: string;
  vehicleId: string;
  reception: ReceptionOrder;
  workshop: WorkshopSheet | null;
  report: ActivityReport | null;
  parts: PartNeed[];
  labor: number;
  invoice: Invoice | null;
  depositPaid: number;
  notes: Note[];
  events: JournalEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface State {
  version: 2;
  settings: Settings;
  staff: Staff[];
  clients: Client[];
  vehicles: Vehicle[];
  products: Product[];
  dossiers: Dossier[];
  purchases: Purchase[];
}

export interface ReceptionInput {
  openedAt: string;
  plate: string;
  receptionist: string;
  particulier: string;
  engine: string;
  phone: string;
  company: string;
  driver: string;
  makeModel: string;
  arrivalFaults: string;
  actor: string;
}

export type Action =
  | { type: "openReception"; payload: ReceptionInput }
  | { type: "updateReception"; payload: { dossierId: string; order: ReceptionOrder; actor: string } }
  | { type: "saveDiagnostic"; payload: { dossierId: string; order: ReceptionOrder; actor: string } }
  | { type: "saveWorkshop"; payload: { dossierId: string; sheet: WorkshopSheet; actor: string } }
  | { type: "addPart"; payload: { dossierId: string; productId: string; label: string; reference: string; qty: number; constat: string; actor: string } }
  | { type: "setPartPrice"; payload: { dossierId: string; partId: string; unitPrice: number; actor: string } }
  | { type: "removePart"; payload: { dossierId: string; partId: string; actor: string } }
  | { type: "setLabor"; payload: { dossierId: string; labor: number; actor: string } }
  | { type: "serveFromStock"; payload: { dossierId: string; partId: string; actor: string } }
  | { type: "requestPurchase"; payload: { dossierId: string; partId: string; qty: number; maxPrice: number; deadline: string; actor: string } }
  | { type: "validatePurchase"; payload: { purchaseId: string; actor: string } }
  | { type: "refusePurchase"; payload: { purchaseId: string; actor: string } }
  | { type: "buyPurchase"; payload: { purchaseId: string; price: number; note: string; actor: string } }
  | { type: "markInvoiceReady"; payload: { dossierId: string; actor: string } }
  | { type: "reopenInvoice"; payload: { dossierId: string; actor: string } }
  | { type: "recordDeposit"; payload: { dossierId: string; amount: number; actor: string } }
  | { type: "saveReport"; payload: { dossierId: string; report: ActivityReport; actor: string } }
  | { type: "finishRepair"; payload: { dossierId: string; actor: string } }
  | { type: "requestClientMeeting"; payload: { dossierId: string; text: string; actor: string } }
  | { type: "saveProduct"; payload: { product: Product; actor: string } };
