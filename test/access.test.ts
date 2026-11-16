import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canPerform, createPlatform, visibleState } from "../lib/platform";
import { verifyPassword } from "../lib/passwords";

describe("espaces du SaaS", () => {
  it("sépare les droits et masque le dossier au client", () => {
    const platform = createPlatform();
    const client = platform.accounts.find((account) => account.clientId === "c_transkipe");
    assert.ok(client);
    assert.equal(verifyPassword("Atelier2026", client.passwordHash), true);
    assert.equal(verifyPassword("autre", client.passwordHash), false);
    assert.equal(canPerform("client", "setClientStatus"), false);
    assert.equal(canPerform("comptabilite", "setClientStatus"), true);
    assert.equal(canPerform("achats", "buyPurchase"), true);
    assert.equal(canPerform("achats", "addComment"), false);
    assert.equal(canPerform("superadmin", "addComment"), false);
    const view = visibleState(platform.garages[0].state, client);
    assert.equal(view.products.length, 0);
    assert.equal(view.purchases.length, 0);
    assert.ok(view.dossiers.every((dossier) => dossier.clientId === "c_transkipe" && dossier.invoice === null));
    assert.ok(view.dossiers.some((dossier) => dossier.clientStatus === null));
  });
});
