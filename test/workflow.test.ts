import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyAction, DomainError, moneyOf } from "../lib/domain";
import { createSeed } from "../lib/seed";
import type { State } from "../lib/types";

function go(state: State, action: Parameters<typeof applyAction>[1]) {
  return applyAction(state, action);
}

describe("circuit du garage de Conakry", () => {
  it("ouvre un ordre, diagnostique, achète, facture, encaisse 70 % puis clôture", () => {
    let state = createSeed();
    state = go(state, {
      type: "openReception",
      payload: {
        openedAt: "2026-11-16",
        plate: "rc 9090 t",
        receptionist: "Aissatou Diallo",
        particulier: "Lamine Keita",
        engine: "Diesel",
        phone: "+224 628 00 11 22",
        company: "",
        driver: "",
        makeModel: "Toyota Corolla",
        arrivalFaults: "Le moteur cale au ralenti.",
        actor: "Aissatou Diallo",
      },
    });
    const dossier = state.dossiers.find((item) => item.reception.plate === "RC 9090 T")!;
    assert.equal(dossier.status, "recu");
    assert.equal(dossier.reception.plate, "RC 9090 T");

    state = go(state, {
      type: "saveDiagnostic",
      payload: {
        dossierId: dossier.id,
        actor: "Mamadou Camara",
        order: {
          ...dossier.reception,
          diagnosticResult: "Ralenti instable, bougies fatiguées.",
          diagnosticDate: "2026-11-16",
          section: "Mécanique",
          intervenant: "Mamadou Camara",
          observation: "Pas d’autre fuite.",
        },
      },
    });
    state = go(state, {
      type: "addPart",
      payload: {
        dossierId: dossier.id,
        productId: "bougies",
        label: "Bougies, jeu",
        reference: "BG-04",
        qty: 1,
        constat: "Usées",
        actor: "Mamadou Camara",
      },
    });
    let current = state.dossiers.find((item) => item.id === dossier.id)!;
    assert.equal(current.status, "diagnostic");
    const part = current.parts[0];
    assert.equal(part.unitPrice, 220000);

    state = go(state, {
      type: "setLabor",
      payload: { dossierId: dossier.id, labor: 150000, actor: "Ibrahima Sow" },
    });
    state = go(state, {
      type: "requestPurchase",
      payload: {
        dossierId: dossier.id,
        partId: part.id,
        qty: 1,
        maxPrice: 200000,
        deadline: "2026-11-18",
        actor: "Ibrahima Sow",
      },
    });
    const purchase = state.purchases.find((item) => item.partId === part.id)!;
    assert.equal(purchase.status, "a_valider");
    assert.equal(state.purchases.filter((item) => item.status === "a_acheter" && item.partId === part.id).length, 0);

    state = go(state, { type: "validatePurchase", payload: { purchaseId: purchase.id, actor: "Alpha Oumar Barry" } });
    state = go(state, {
      type: "buyPurchase",
      payload: { purchaseId: purchase.id, price: 170000, note: "Madina", actor: "Mariama Sylla" },
    });
    const bought = state.purchases.find((item) => item.id === purchase.id)!;
    assert.equal(bought.status, "achete");
    assert.equal(bought.boughtPrice, 170000);
    assert.equal(state.products.find((item) => item.id === "bougies")!.stock, 6);

    state = go(state, { type: "markInvoiceReady", payload: { dossierId: dossier.id, actor: "Ibrahima Sow" } });
    current = state.dossiers.find((item) => item.id === dossier.id)!;
    assert.equal(current.status, "facture_prete");
    const bill = moneyOf(current.invoice!, current.depositPaid);
    assert.ok(bill.depositDue > 0);
    assert.equal(bill.covered, false);

    assert.throws(
      () => go(state, { type: "finishRepair", payload: { dossierId: dossier.id, actor: "Fatoumata Bah" } }),
      (error: unknown) => error instanceof DomainError && /70 %/.test((error as Error).message),
    );

    state = go(state, {
      type: "recordDeposit",
      payload: { dossierId: dossier.id, amount: bill.depositDue, actor: "Ibrahima Sow" },
    });
    current = state.dossiers.find((item) => item.id === dossier.id)!;
    assert.equal(current.status, "paiement_effectue");

    state = go(state, {
      type: "saveReport",
      payload: {
        dossierId: dossier.id,
        actor: "Fatoumata Bah",
        report: {
          plate: "RC 9090 T",
          makeModel: "Toyota Corolla",
          kms: "120000",
          clientName: "Lamine Keita",
          entryDate: "2026-11-16",
          exitDate: "2026-11-16",
          phone: "+224 628 00 11 22",
          driver: "",
          faults: "Le moteur cale au ralenti.",
          workAndParts: "Jeu de bougies remplacé.",
          observation: "Ralenti stable.",
          chef: "Fatoumata Bah",
          date: "2026-11-16",
          time: "17:00",
          chefSignature: "",
          clientSigner: "Lamine Keita",
          clientSignature: "",
          director: "Alpha Oumar Barry",
          directorSignature: "",
        },
      },
    });
    state = go(state, { type: "finishRepair", payload: { dossierId: dossier.id, actor: "Fatoumata Bah" } });
    current = state.dossiers.find((item) => item.id === dossier.id)!;
    assert.equal(current.status, "reparation_faite");
  });

  it("refuse d’encaisser avant la facture et de modifier une facture payée", () => {
    const state = createSeed();
    assert.throws(
      () => go(state, { type: "recordDeposit", payload: { dossierId: "d_307", amount: 1000, actor: "Ibrahima Sow" } }),
      DomainError,
    );
    assert.throws(
      () => go(state, { type: "reopenInvoice", payload: { dossierId: "d_patrol", actor: "Ibrahima Sow" } }),
      DomainError,
    );
    assert.throws(
      () =>
        go(state, {
          type: "openReception",
          payload: {
            openedAt: "2026-11-16",
            plate: "RC 1",
            receptionist: "Aissatou Diallo",
            particulier: "",
            engine: "Diesel",
            phone: "+224 622 00 00 00",
            company: "Société X",
            driver: "",
            makeModel: "Hilux",
            arrivalFaults: "Bruit",
            actor: "Aissatou Diallo",
          },
        }),
      DomainError,
    );
  });
});
