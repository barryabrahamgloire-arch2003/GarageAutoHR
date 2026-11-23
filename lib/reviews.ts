import { randomUUID } from "crypto";
import { loadPlatform, updatePlatform } from "./store";
import type { ClientReview } from "./platform";

export type { ClientReview };

export const REVIEW_CODE = "kosmossolutions27";

export const REVIEW_QUESTIONS = [
  "L’accueil et l’écoute",
  "La qualité du diagnostic et de la réparation",
  "Le respect des délais annoncés",
  "La clarté du devis et la confiance",
] as const;

function clip(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function isReviewHoneypot(body: unknown) {
  if (!body || typeof body !== "object") return false;
  return clip((body as { website?: unknown }).website, 200).length > 0;
}

export function parseReview(body: unknown): ClientReview {
  if (!body || typeof body !== "object") throw new Error("Avis illisible.");
  const raw = body as Record<string, unknown>;
  const name = clip(raw.name, 120);
  const comment = clip(raw.comment, 2000);
  const scores = Array.isArray(raw.scores) ? raw.scores.map((value) => Number(value)) : [];
  if (name.length < 2) throw new Error("Indiquez votre nom.");
  if (scores.length !== 4 || scores.some((score) => !Number.isInteger(score) || score < 1 || score > 5)) {
    throw new Error("Notez chaque question de 1 à 5.");
  }
  if (comment.length < 4) throw new Error("Écrivez votre avis.");
  return { id: randomUUID(), name, scores, comment, createdAt: new Date().toISOString() };
}

export function codeMatches(value: unknown) {
  return clip(value, 80) === REVIEW_CODE;
}

export async function saveReview(review: ClientReview) {
  await updatePlatform((platform) => {
    platform.reviews = [review, ...(platform.reviews ?? [])].slice(0, 400);
  });
}

export async function listReviews(): Promise<ClientReview[]> {
  const platform = await loadPlatform();
  return [...(platform.reviews ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
