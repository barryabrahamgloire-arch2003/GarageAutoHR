import { randomUUID } from "crypto";
import { loadPlatform, updatePlatform } from "./store";
import type { OnlineRequest } from "./platform";

export type { OnlineRequest };
export type RequestKind = OnlineRequest["kind"];

function clip(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function isHoneypot(body: unknown) {
  if (!body || typeof body !== "object") return false;
  return clip((body as { website?: unknown }).website, 200).length > 0;
}

export function parseOnlineRequest(body: unknown): OnlineRequest {
  if (!body || typeof body !== "object") throw new Error("Demande illisible.");
  const raw = body as Record<string, unknown>;
  const kind: RequestKind = raw.kind === "fournisseur" ? "fournisseur" : "client";
  const name = clip(raw.name, 120);
  const phone = clip(raw.phone, 40);
  const email = clip(raw.email, 160);
  const subject = clip(raw.subject, 160);
  const vehicle = clip(raw.vehicle, 160);
  const category = clip(raw.category, 160);
  const message = clip(raw.message, 4000);
  if (name.length < 2) throw new Error("Indiquez votre nom.");
  if (phone.length < 6) throw new Error("Indiquez un téléphone.");
  if (subject.length < 2) throw new Error("Indiquez le type de demande.");
  if (message.length < 4) throw new Error("Décrivez votre demande.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("L’email n’est pas valide.");
  return {
    id: randomUUID(),
    kind,
    name,
    phone,
    email,
    subject,
    vehicle,
    category,
    message,
    createdAt: new Date().toISOString(),
    seenAt: null,
  };
}

export async function saveOnlineRequest(request: OnlineRequest) {
  await updatePlatform((platform) => {
    platform.onlineRequests = [request, ...(platform.onlineRequests ?? [])].slice(0, 300);
  });
}

export async function listOnlineRequests(): Promise<OnlineRequest[]> {
  const platform = await loadPlatform();
  return [...(platform.onlineRequests ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function markOnlineRequestSeen(id: string) {
  let updated: OnlineRequest | null = null;
  await updatePlatform((platform) => {
    const item = (platform.onlineRequests ?? []).find((row) => row.id === id);
    if (!item) return;
    item.seenAt = item.seenAt ?? new Date().toISOString();
    updated = { ...item };
  });
  if (!updated) throw new Error("Demande introuvable.");
  return updated;
}
