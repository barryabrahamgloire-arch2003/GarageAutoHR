import type {
  Action,
  ActivityReport,
  Dossier,
  Invoice,
  PartNeed,
  Product,
  Purchase,
  ReceptionInput,
  ReceptionOrder,
  Settings,
  State,
  WorkshopSheet,
  WorkshopTask,
} from "./types";
import { keepPhoto } from "./photo";
import { clock, today } from "./format";

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function must<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new DomainError(message);
  return value;
}

function dossierOf(state: State, id: string) {
  return must(
    state.dossiers.find((item) => item.id === id),
    "Dossier introuvable.",
  );
}

function replaceDossier(state: State, dossier: Dossier): State {
  return {
    ...state,
    dossiers: state.dossiers.map((item) => (item.id === dossier.id ? dossier : item)),
  };
}

function log(dossier: Dossier, actor: string, text: string): Dossier {
  return {
    ...dossier,
    updatedAt: nowIso(),
    events: [{ id: uid("ev"), at: nowIso(), actor, text }, ...dossier.events].slice(0, 40),
  };
}

function actorOf(actor: string) {
  const name = actor.trim();
  if (!name) throw new DomainError("Indiquez qui fait l’action.");
  return name;
}

function frozen(dossier: Dossier) {
  return Boolean(dossier.invoice);
}

function assertOpenForPricing(dossier: Dossier) {
  if (frozen(dossier)) {
    throw new DomainError("La facture est figée. Rouvrez-la avant de modifier les prix.");
  }
}

export function moneyOf(invoice: Pick<Invoice, "lines" | "labor" | "vatRate" | "depositRate">, depositPaid: number) {
  const parts = invoice.lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
  const ht = parts + invoice.labor;
  const tva = Math.round(ht * invoice.vatRate);
  const ttc = ht + tva;
  const depositDue = Math.round(ttc * invoice.depositRate);
  return {
    parts,
    ht,
    tva,
    ttc,
    depositDue,
    paid: depositPaid,
    depositRemaining: Math.max(0, depositDue - depositPaid),
    balance: Math.max(0, ttc - depositPaid),
    covered: depositPaid + 0.001 >= depositDue && depositDue > 0,
  };
}

export function liveInvoice(dossier: Dossier, settings: Settings): Invoice {
  if (dossier.invoice) return dossier.invoice;
  return {
    number: `FAC-${dossier.number}`,
    lines: dossier.parts.map((part) => ({
      id: part.id,
      label: part.label,
      qty: part.qty,
      unitPrice: part.unitPrice,
    })),
    labor: dossier.labor,
    vatRate: settings.vat,
    depositRate: settings.depositRate,
    readyAt: "",
  };
}

export function emptyReception(actor: string): ReceptionOrder {
  return {
    openedAt: today(),
    plate: "",
    receptionist: actor,
    particulier: "",
    engine: "Diesel",
    phone: "",
    company: "",
    driver: "",
    makeModel: "",
    arrivalFaults: "",
    diagnosticResult: "",
    diagnosticDate: "",
    section: "",
    intervenant: "",
    observation: "",
    workEndDate: "",
    managerName: "",
    managerSignature: "",
    clientSigner: "",
    clientSignature: "",
  };
}

export function blankTask(): WorkshopTask {
  return { id: uid("tk"), date: today(), work: "", reference: "", observation: "" };
}

export function emptyWorkshop(dossier: Dossier, intervenant: string, chef: string): WorkshopSheet {
  return {
    startDate: today(),
    endDate: "",
    startTime: clock(),
    endTime: "",
    makeModel: dossier.reception.makeModel,
    section: dossier.reception.section || "Mécanique",
    plate: dossier.reception.plate,
    odometerEnd: "",
    tasks: [blankTask()],
    intervenant,
    intervenantSignature: "",
    chef,
    chefSignature: "",
  };
}

export function reportDraft(state: State, dossier: Dossier, director: string): ActivityReport {
  if (dossier.report) return dossier.report;
  const client = must(state.clients.find((item) => item.id === dossier.clientId), "Client introuvable.");
  const works = (dossier.workshop?.tasks ?? []).map((task) => task.work.trim()).filter(Boolean);
  const parts = dossier.parts.map((part) => `${part.qty} × ${part.label}`);
  const workAndParts = [
    ...works,
    parts.length ? `Pièces : ${parts.join(", ")}` : "",
  ].filter(Boolean).join("\n");
  return {
    plate: dossier.reception.plate,
    makeModel: dossier.reception.makeModel,
    kms: dossier.workshop?.odometerEnd ?? "",
    clientName: client.company || client.name,
    entryDate: dossier.reception.openedAt,
    exitDate: "",
    phone: client.phone,
    driver: dossier.reception.driver,
    faults: dossier.reception.arrivalFaults,
    workAndParts,
    observation: dossier.reception.observation,
    chef: dossier.workshop?.chef ?? "",
    date: today(),
    time: clock(),
    chefSignature: "",
    clientSigner: client.name,
    clientSignature: "",
    director,
    directorSignature: "",
  };
}

function advance(dossier: Dossier, status: Dossier["status"]) {
  const order = ["recu", "diagnostic", "facture_prete", "paiement_effectue", "reparation_faite"];
  if (order.indexOf(status) > order.indexOf(dossier.status)) return status;
  return dossier.status;
}

function cleanTasks(tasks: WorkshopTask[]) {
  const kept = tasks
    .map((task) => ({
      ...task,
      id: task.id || uid("tk"),
      work: task.work.trim(),
      reference: task.reference.trim(),
      observation: task.observation.trim(),
    }))
    .filter((task) => task.work || task.reference || task.observation);
  if (!kept.length) throw new DomainError("Ajoutez au moins un travail à effectuer.");
  return kept;
}

function nextNumber(state: State) {
  const values = state.dossiers
    .map((item) => Number(item.number.replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value));
  const max = values.length ? Math.max(...values) : 2600;
  return `HR-${max + 1}`;
}

function requireText(value: string, message: string) {
  if (!value.trim()) throw new DomainError(message);
  return value.trim();
}

export function applyAction(state: State, action: Action): State {
  switch (action.type) {
    case "openReception":
      return openReception(state, action.payload);
    case "updateReception":
      return updateReception(state, action.payload.dossierId, action.payload.order, action.payload.actor);
    case "saveDiagnostic":
      return saveDiagnostic(state, action.payload.dossierId, action.payload.order, action.payload.actor);
    case "saveWorkshop":
      return saveWorkshop(state, action.payload.dossierId, action.payload.sheet, action.payload.actor);
    case "addPart":
      return addPart(state, action.payload);
    case "setPartPrice":
      return setPartPrice(state, action.payload.dossierId, action.payload.partId, action.payload.unitPrice, action.payload.actor);
    case "removePart":
      return removePart(state, action.payload.dossierId, action.payload.partId, action.payload.actor);
    case "setLabor":
      return setLabor(state, action.payload.dossierId, action.payload.labor, action.payload.actor);
    case "serveFromStock":
      return serveFromStock(state, action.payload.dossierId, action.payload.partId, action.payload.actor);
    case "requestPurchase":
      return requestPurchase(state, action.payload);
    case "validatePurchase":
      return setPurchaseStatus(state, action.payload.purchaseId, "a_acheter", action.payload.actor);
    case "refusePurchase":
      return setPurchaseStatus(state, action.payload.purchaseId, "refuse", action.payload.actor);
    case "buyPurchase":
      return buyPurchase(state, action.payload.purchaseId, action.payload.price, action.payload.note, action.payload.actor);
    case "markInvoiceReady":
      return markInvoiceReady(state, action.payload.dossierId, action.payload.actor);
    case "reopenInvoice":
      return reopenInvoice(state, action.payload.dossierId, action.payload.actor);
    case "recordDeposit":
      return recordDeposit(state, action.payload.dossierId, action.payload.amount, action.payload.actor);
    case "saveReport":
      return saveReport(state, action.payload.dossierId, action.payload.report, action.payload.actor);
    case "finishRepair":
      return finishRepair(state, action.payload.dossierId, action.payload.actor);
    case "requestClientMeeting":
      return requestClientMeeting(state, action.payload.dossierId, action.payload.text, action.payload.actor);
    case "addComment":
      return addComment(state, action.payload.dossierId, action.payload.text, action.payload.actor);
    case "setClientStatus":
      return setClientStatus(state, action.payload.dossierId, action.payload.status, action.payload.actor);
    case "saveProduct":
      return saveProduct(state, action.payload.product, action.payload.actor);
    default:
      return state;
  }
}

function openReception(state: State, input: ReceptionInput): State {
  const actor = actorOf(input.actor);
  const particulier = input.particulier.trim();
  const company = input.company.trim();
  if (!particulier && !company) throw new DomainError("Indiquez le particulier ou l’entreprise.");
  const plate = requireText(input.plate, "Le numéro d’immatriculation est obligatoire.").toUpperCase();
  const phone = requireText(input.phone, "Le téléphone est obligatoire.");
  const makeModel = requireText(input.makeModel, "La marque et le modèle sont obligatoires.");
  const engine = requireText(input.engine, "Le moteur est obligatoire.");
  const faults = requireText(input.arrivalFaults, "Notez la déclaration de pannes du client.");
  const openedAt = requireText(input.openedAt, "La date d’ouverture est obligatoire.");
  const receptionist = requireText(input.receptionist, "Indiquez le réceptionniste.");
  if (company && !input.driver.trim()) throw new DomainError("Indiquez le chauffeur de l’entreprise.");

  const clientId = uid("c");
  const vehicleId = uid("v");
  const dossierId = uid("d");
  const stamp = nowIso();
  const order: ReceptionOrder = {
    ...emptyReception(receptionist),
    openedAt,
    plate,
    receptionist,
    particulier,
    engine,
    phone,
    company,
    driver: input.driver.trim(),
    makeModel,
    arrivalFaults: faults,
    clientSigner: particulier || company,
  };
  const dossier: Dossier = {
    id: dossierId,
    number: nextNumber(state),
    status: "recu",
    clientStatus: null,
    clientId,
    vehicleId,
    reception: order,
    workshop: null,
    report: null,
    parts: [],
    labor: 0,
    invoice: null,
    depositPaid: 0,
    notes: [],
    photo: keepPhoto(input.photo),
    events: [{ id: uid("ev"), at: stamp, actor, text: "Ordre de réception ouvert." }],
    createdAt: stamp,
    updatedAt: stamp,
  };
  return {
    ...state,
    clients: [
      {
        id: clientId,
        kind: company ? "entreprise" : "particulier",
        name: particulier || company,
        phone,
        company,
        driver: input.driver.trim(),
      },
      ...state.clients,
    ],
    vehicles: [
      { id: vehicleId, clientId, plate, makeModel, engine },
      ...state.vehicles,
    ],
    dossiers: [dossier, ...state.dossiers],
  };
}

function syncIdentity(state: State, dossier: Dossier, order: ReceptionOrder): State {
  const company = order.company.trim();
  const particulier = order.particulier.trim();
  return {
    ...replaceDossier(state, dossier),
    clients: state.clients.map((client) =>
      client.id === dossier.clientId
        ? {
            ...client,
            kind: company ? "entreprise" : "particulier",
            name: particulier || company || client.name,
            phone: order.phone.trim() || client.phone,
            company,
            driver: order.driver.trim(),
          }
        : client,
    ),
    vehicles: state.vehicles.map((vehicle) =>
      vehicle.id === dossier.vehicleId
        ? {
            ...vehicle,
            plate: order.plate.trim().toUpperCase() || vehicle.plate,
            makeModel: order.makeModel.trim() || vehicle.makeModel,
            engine: order.engine.trim() || vehicle.engine,
          }
        : vehicle,
    ),
  };
}

function updateReception(state: State, dossierId: string, order: ReceptionOrder, actor: string): State {
  const name = actorOf(actor);
  const dossier = dossierOf(state, dossierId);
  if (!order.particulier.trim() && !order.company.trim()) {
    throw new DomainError("Indiquez le particulier ou l’entreprise.");
  }
  const next = log({ ...dossier, reception: { ...order, plate: order.plate.trim().toUpperCase() } }, name, "Ordre de réception mis à jour.");
  return syncIdentity(state, next, next.reception);
}

function saveDiagnostic(state: State, dossierId: string, order: ReceptionOrder, actor: string): State {
  const name = actorOf(actor);
  requireText(order.diagnosticResult, "Écrivez le résultat du diagnostic.");
  requireText(order.diagnosticDate, "La date du diagnostic est obligatoire.");
  requireText(order.section, "Indiquez la section.");
  requireText(order.intervenant, "Indiquez le prénom et le nom de l’intervenant.");
  const dossier = dossierOf(state, dossierId);
  const next = log(
    {
      ...dossier,
      status: advance(dossier, "diagnostic"),
      reception: { ...order, plate: order.plate.trim().toUpperCase() },
    },
    name,
    "Diagnostic d’atelier enregistré.",
  );
  return syncIdentity(state, next, next.reception);
}

function saveWorkshop(state: State, dossierId: string, sheet: WorkshopSheet, actor: string): State {
  const name = actorOf(actor);
  requireText(sheet.startDate, "La date de début est obligatoire.");
  requireText(sheet.section, "Indiquez la section.");
  requireText(sheet.intervenant, "Indiquez le nom de l’intervenant.");
  requireText(sheet.chef, "Indiquez le chef d’atelier.");
  const tasks = cleanTasks(sheet.tasks);
  const dossier = dossierOf(state, dossierId);
  const next = log(
    {
      ...dossier,
      status: advance(dossier, "diagnostic"),
      workshop: {
        ...sheet,
        plate: sheet.plate.trim().toUpperCase() || dossier.reception.plate,
        makeModel: sheet.makeModel.trim() || dossier.reception.makeModel,
        tasks,
      },
    },
    name,
    "Fiche d’atelier enregistrée.",
  );
  return replaceDossier(state, next);
}

function addPart(
  state: State,
  payload: { dossierId: string; productId: string; label: string; reference: string; qty: number; constat: string; actor: string },
): State {
  const name = actorOf(payload.actor);
  const dossier = dossierOf(state, payload.dossierId);
  assertOpenForPricing(dossier);
  const label = requireText(payload.label, "Nommez la pièce.");
  if (!Number.isFinite(payload.qty) || payload.qty <= 0) throw new DomainError("La quantité doit être supérieure à zéro.");
  const product = state.products.find((item) => item.id === payload.productId);
  const part: PartNeed = {
    id: uid("pt"),
    productId: product?.id ?? "",
    label,
    reference: (payload.reference || product?.reference || "").trim(),
    qty: Math.round(payload.qty),
    constat: payload.constat.trim(),
    unitPrice: product?.price ?? 0,
    served: false,
  };
  const next = log(
    { ...dossier, status: advance(dossier, "diagnostic"), parts: [...dossier.parts, part] },
    name,
    `Pièce ajoutée : ${part.label}.`,
  );
  return replaceDossier(state, next);
}

function setPartPrice(state: State, dossierId: string, partId: string, unitPrice: number, actor: string): State {
  const name = actorOf(actor);
  const dossier = dossierOf(state, dossierId);
  assertOpenForPricing(dossier);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new DomainError("Prix invalide.");
  if (!dossier.parts.some((part) => part.id === partId)) throw new DomainError("Pièce introuvable.");
  const next = log(
    {
      ...dossier,
      parts: dossier.parts.map((part) => (part.id === partId ? { ...part, unitPrice: Math.round(unitPrice) } : part)),
    },
    name,
    "Prix de vente mis à jour.",
  );
  return replaceDossier(state, next);
}

function removePart(state: State, dossierId: string, partId: string, actor: string): State {
  const name = actorOf(actor);
  const dossier = dossierOf(state, dossierId);
  assertOpenForPricing(dossier);
  const part = dossier.parts.find((item) => item.id === partId);
  if (!part) throw new DomainError("Pièce introuvable.");
  if (part.served) throw new DomainError("Cette pièce a déjà été sortie du stock.");
  const next = log(
    { ...dossier, parts: dossier.parts.filter((item) => item.id !== partId) },
    name,
    `Pièce retirée : ${part.label}.`,
  );
  return {
    ...replaceDossier(state, next),
    purchases: state.purchases.map((purchase) =>
      purchase.partId === partId && purchase.status !== "achete"
        ? { ...purchase, status: "refuse" }
        : purchase,
    ),
  };
}

function setLabor(state: State, dossierId: string, labor: number, actor: string): State {
  const name = actorOf(actor);
  const dossier = dossierOf(state, dossierId);
  assertOpenForPricing(dossier);
  if (!Number.isFinite(labor) || labor < 0) throw new DomainError("Main-d’œuvre invalide.");
  return replaceDossier(state, log({ ...dossier, labor: Math.round(labor) }, name, "Main-d’œuvre mise à jour."));
}

function serveFromStock(state: State, dossierId: string, partId: string, actor: string): State {
  const name = actorOf(actor);
  const dossier = dossierOf(state, dossierId);
  const part = dossier.parts.find((item) => item.id === partId);
  if (!part) throw new DomainError("Pièce introuvable.");
  if (part.served) throw new DomainError("Cette pièce est déjà servie.");
  const product = state.products.find((item) => item.id === part.productId);
  if (!product) throw new DomainError("Cette pièce n’est pas dans la grille. Achetez-la ou reliez-la à un produit.");
  if (product.stock < part.qty) throw new DomainError("Stock insuffisant. Passez une demande d’achat.");
  const next = log(
    { ...dossier, parts: dossier.parts.map((item) => (item.id === partId ? { ...item, served: true } : item)) },
    name,
    `${part.label} sorti du stock.`,
  );
  return {
    ...replaceDossier(state, next),
    products: state.products.map((item) => (item.id === product.id ? { ...item, stock: item.stock - part.qty } : item)),
  };
}

function requestPurchase(
  state: State,
  payload: { dossierId: string; partId: string; qty: number; maxPrice: number; deadline: string; actor: string },
): State {
  const name = actorOf(payload.actor);
  const dossier = dossierOf(state, payload.dossierId);
  const part = dossier.parts.find((item) => item.id === payload.partId);
  if (!part) throw new DomainError("Pièce introuvable.");
  if (payload.qty <= 0) throw new DomainError("La quantité à acheter doit être supérieure à zéro.");
  if (!Number.isFinite(payload.maxPrice) || payload.maxPrice < 0) throw new DomainError("Indiquez le prix maximum.");
  requireText(payload.deadline, "Indiquez l’échéance.");
  const pending = state.purchases.some(
    (item) => item.partId === part.id && (item.status === "a_valider" || item.status === "a_acheter"),
  );
  if (pending) throw new DomainError("Une demande d’achat est déjà en cours pour cette pièce.");
  const purchase: Purchase = {
    id: uid("ach"),
    dossierId: dossier.id,
    partId: part.id,
    label: part.label,
    reference: part.reference,
    plate: dossier.reception.plate,
    qty: Math.round(payload.qty),
    maxPrice: Math.round(payload.maxPrice),
    deadline: payload.deadline,
    status: "a_valider",
    askedBy: name,
    validatedBy: "",
    boughtPrice: null,
    boughtAt: "",
    supplierNote: "",
  };
  const next = log(dossier, name, `Achat demandé : ${part.label}.`);
  return { ...replaceDossier(state, next), purchases: [purchase, ...state.purchases] };
}

function setPurchaseStatus(state: State, purchaseId: string, status: "a_acheter" | "refuse", actor: string): State {
  const name = actorOf(actor);
  const purchase = state.purchases.find((item) => item.id === purchaseId);
  if (!purchase) throw new DomainError("Demande d’achat introuvable.");
  if (purchase.status !== "a_valider") throw new DomainError("Cette demande n’est plus à valider.");
  const dossier = log(
    dossierOf(state, purchase.dossierId),
    name,
    status === "a_acheter" ? `Achat validé : ${purchase.label}.` : `Achat refusé : ${purchase.label}.`,
  );
  return {
    ...replaceDossier(state, dossier),
    purchases: state.purchases.map((item) =>
      item.id === purchaseId ? { ...item, status, validatedBy: name } : item,
    ),
  };
}

function buyPurchase(state: State, purchaseId: string, price: number, note: string, actor: string): State {
  const name = actorOf(actor);
  const purchase = state.purchases.find((item) => item.id === purchaseId);
  if (!purchase) throw new DomainError("Achat introuvable.");
  if (purchase.status !== "a_acheter") throw new DomainError("Cet achat n’est pas validé par la direction.");
  if (!Number.isFinite(price) || price < 0) throw new DomainError("Indiquez le prix obtenu.");
  const dossier = dossierOf(state, purchase.dossierId);
  const part = dossier.parts.find((item) => item.id === purchase.partId);
  let products = state.products;
  if (part?.productId) {
    products = products.map((product) =>
      product.id === part.productId ? { ...product, stock: product.stock + purchase.qty } : product,
    );
  }
  const next = log(dossier, name, `${purchase.label} acheté à ${Math.round(price).toLocaleString("fr-FR")} GNF.`);
  return {
    ...replaceDossier(state, next),
    products,
    purchases: state.purchases.map((item) =>
      item.id === purchaseId
        ? {
            ...item,
            status: "achete",
            boughtPrice: Math.round(price),
            boughtAt: nowIso(),
            supplierNote: note.trim(),
            validatedBy: item.validatedBy || name,
          }
        : item,
    ),
  };
}

function markInvoiceReady(state: State, dossierId: string, actor: string): State {
  const name = actorOf(actor);
  const dossier = dossierOf(state, dossierId);
  if (dossier.status === "recu") throw new DomainError("Le diagnostic de l’atelier est nécessaire avant la facture.");
  if (dossier.invoice) throw new DomainError("La facture est déjà prête.");
  if (!dossier.parts.length && dossier.labor <= 0) {
    throw new DomainError("Ajoutez des pièces ou une main-d’œuvre avant de figer la facture.");
  }
  if (dossier.parts.some((part) => part.unitPrice <= 0)) {
    throw new DomainError("Chaque pièce doit avoir un prix de vente.");
  }
  const invoice = liveInvoice(dossier, state.settings);
  const bill = moneyOf(invoice, 0);
  if (bill.ttc <= 0) throw new DomainError("Le total de la facture est vide.");
  const next = log(
    {
      ...dossier,
      status: "facture_prete",
      invoice: { ...invoice, readyAt: nowIso() },
    },
    name,
    "Facture prête.",
  );
  return replaceDossier(state, next);
}

function reopenInvoice(state: State, dossierId: string, actor: string): State {
  const name = actorOf(actor);
  const dossier = dossierOf(state, dossierId);
  if (!dossier.invoice) throw new DomainError("Aucune facture à rouvrir.");
  if (dossier.depositPaid > 0) throw new DomainError("Un paiement est déjà enregistré.");
  if (dossier.status === "reparation_faite") throw new DomainError("La réparation est déjà terminée.");
  const next = log(
    { ...dossier, invoice: null, status: "diagnostic" },
    name,
    "Facture rouverte.",
  );
  return replaceDossier(state, next);
}

function recordDeposit(state: State, dossierId: string, amount: number, actor: string): State {
  const name = actorOf(actor);
  const dossier = dossierOf(state, dossierId);
  if (!dossier.invoice) throw new DomainError("La facture n’est pas prête.");
  if (!Number.isFinite(amount) || amount <= 0) throw new DomainError("Indiquez le montant reçu.");
  const bill = moneyOf(dossier.invoice, dossier.depositPaid);
  if (amount > bill.balance) throw new DomainError("Ce montant dépasse le reste à payer.");
  const depositPaid = dossier.depositPaid + Math.round(amount);
  const covered = moneyOf(dossier.invoice, depositPaid).covered;
  const status = covered ? advance(dossier, "paiement_effectue") : dossier.status;
  const next = log(
    { ...dossier, depositPaid, status },
    name,
    covered ? "Acompte de 70 % reçu. La réparation peut commencer." : "Paiement enregistré.",
  );
  return replaceDossier(state, next);
}

function saveReport(state: State, dossierId: string, report: ActivityReport, actor: string): State {
  const name = actorOf(actor);
  requireText(report.workAndParts, "Décrivez les travaux effectués et les pièces changées.");
  requireText(report.chef, "Indiquez le chef d’atelier.");
  requireText(report.faults, "La description des pannes est obligatoire.");
  const dossier = dossierOf(state, dossierId);
  const next = log({ ...dossier, report }, name, "Rapport d’activité enregistré.");
  return replaceDossier(state, next);
}

function finishRepair(state: State, dossierId: string, actor: string): State {
  const name = actorOf(actor);
  const dossier = dossierOf(state, dossierId);
  if (!dossier.invoice) throw new DomainError("Il n’y a pas encore de facture.");
  const bill = moneyOf(dossier.invoice, dossier.depositPaid);
  if (!bill.covered) {
    throw new DomainError("La réparation attend le paiement de 70 % de la facture.");
  }
  if (!dossier.report || !dossier.report.workAndParts.trim() || !dossier.report.chef.trim()) {
    throw new DomainError("Enregistrez le rapport d’activité avant de clôturer.");
  }
  const date = today();
  const next = log(
    {
      ...dossier,
      status: "reparation_faite",
      reception: { ...dossier.reception, workEndDate: dossier.reception.workEndDate || date },
      report: {
        ...dossier.report,
        exitDate: dossier.report.exitDate || date,
        date: dossier.report.date || date,
        time: dossier.report.time || clock(),
      },
      workshop: dossier.workshop
        ? { ...dossier.workshop, endDate: dossier.workshop.endDate || date, endTime: dossier.workshop.endTime || clock() }
        : null,
    },
    name,
    "Réparation terminée.",
  );
  return replaceDossier(state, next);
}

function addComment(state: State, dossierId: string, text: string, actor: string): State {
  const name = actorOf(actor);
  const message = requireText(text, "Écrivez le commentaire.");
  const dossier = dossierOf(state, dossierId);
  const next = log(
    {
      ...dossier,
      notes: [{ id: uid("nt"), at: nowIso(), author: name, text: message, kind: "commentaire" }, ...dossier.notes],
    },
    name,
    "Commentaire de la direction.",
  );
  return replaceDossier(state, next);
}

function setClientStatus(state: State, dossierId: string, status: Dossier["status"], actor: string): State {
  const name = actorOf(actor);
  const order = ["recu", "diagnostic", "facture_prete", "paiement_effectue", "reparation_faite"];
  if (!order.includes(status)) throw new DomainError("Statut inconnu.");
  const dossier = dossierOf(state, dossierId);
  const labels: Record<Dossier["status"], string> = {
    recu: "Reçu",
    diagnostic: "Diagnostic",
    facture_prete: "Facture prête",
    paiement_effectue: "Paiement effectué",
    reparation_faite: "Réparation faite",
  };
  const next = log(
    { ...dossier, clientStatus: status },
    name,
    `Statut publié au client : ${labels[status]}.`,
  );
  return replaceDossier(state, next);
}

function requestClientMeeting(state: State, dossierId: string, text: string, actor: string): State {
  const name = actorOf(actor);
  const message = requireText(text, "Écrivez le message pour le client.");
  const dossier = dossierOf(state, dossierId);
  const next = log(
    {
      ...dossier,
      notes: [{ id: uid("nt"), at: nowIso(), author: name, text: message, kind: "voir_client" }, ...dossier.notes],
    },
    name,
    "Demande de voir le client.",
  );
  return replaceDossier(state, next);
}

function saveProduct(state: State, product: Product, actor: string): State {
  actorOf(actor);
  const name = requireText(product.name, "Nommez le produit.");
  if (!Number.isFinite(product.price) || product.price < 0) throw new DomainError("Prix invalide.");
  if (!Number.isFinite(product.stock) || product.stock < 0) throw new DomainError("Stock invalide.");
  const next: Product = {
    ...product,
    id: product.id || uid("pr"),
    name,
    reference: product.reference.trim(),
    category: product.category.trim() || "Pièces",
    price: Math.round(product.price),
    stock: Math.round(product.stock),
    unit: product.unit.trim() || "pièce",
  };
  const exists = state.products.some((item) => item.id === next.id);
  return {
    ...state,
    products: exists ? state.products.map((item) => (item.id === next.id ? next : item)) : [next, ...state.products],
  };
}
