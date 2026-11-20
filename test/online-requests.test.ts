import assert from "node:assert/strict";
import test from "node:test";
import { isHoneypot, parseOnlineRequest } from "../lib/online-requests";

test("une demande client garde l’essentiel", () => {
  const request = parseOnlineRequest({
    kind: "client",
    name: "Awa Camara",
    phone: "+224 620 00 00 00",
    email: "awa@exemple.com",
    subject: "Devis freinage",
    vehicle: "Toyota Corolla",
    message: "Les freins grincent depuis une semaine.",
  });
  assert.equal(request.kind, "client");
  assert.equal(request.name, "Awa Camara");
  assert.equal(request.vehicle, "Toyota Corolla");
  assert.equal(request.seenAt, null);
});

test("une demande incomplète est refusée", () => {
  assert.throws(() => parseOnlineRequest({ kind: "client", name: "A", phone: "12", subject: "Devis", message: "ok" }));
});

test("le champ caché est un leurre", () => {
  assert.equal(isHoneypot({ website: "https://spam.test" }), true);
  assert.equal(isHoneypot({ website: "  " }), false);
});
