import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { codeMatches, isReviewHoneypot, parseReview } from "../lib/reviews";

describe("avis clients", () => {
  it("garde quatre notes et le témoignage", () => {
    const review = parseReview({
      name: "Awa Camara",
      scores: [5, 4, 5, 3],
      comment: "Travail propre, je recommande le garage.",
    });
    assert.equal(review.name, "Awa Camara");
    assert.deepEqual(review.scores, [5, 4, 5, 3]);
  });

  it("refuse une note incomplète", () => {
    assert.throws(() => parseReview({ name: "Awa", scores: [5, 4], comment: "Trop court mais long" }), /Notez/);
  });

  it("reconnaît le code de lecture", () => {
    assert.equal(codeMatches("kosmossolutions27"), true);
    assert.equal(codeMatches("autre"), false);
    assert.equal(isReviewHoneypot({ website: "spam" }), true);
  });
});
