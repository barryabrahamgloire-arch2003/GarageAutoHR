import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type RequestKind = "client" | "fournisseur";

export interface OnlineRequest {
  id: string;
  kind: RequestKind;
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

const BUCKET = "online-requests";

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

function folder() {
  const preferred = path.join(process.cwd(), "data", "online-requests");
  try {
    fs.mkdirSync(preferred, { recursive: true });
    fs.accessSync(preferred, fs.constants.W_OK);
    return preferred;
  } catch {
    const fallback = path.join("/tmp", "garage-auto-hr", "online-requests");
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

function remote(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function ensureBucket(client: SupabaseClient) {
  const { error } = await client.storage.createBucket(BUCKET, { public: false });
  if (error && !/exist|duplicate|already/i.test(error.message)) throw error;
}

function isRequest(value: unknown): value is OnlineRequest {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<OnlineRequest>;
  return typeof row.id === "string" && (row.kind === "client" || row.kind === "fournisseur") && typeof row.message === "string";
}

export async function saveOnlineRequest(request: OnlineRequest) {
  const client = remote();
  if (!client) {
    fs.writeFileSync(path.join(folder(), `${request.id}.json`), JSON.stringify(request));
    return;
  }
  await ensureBucket(client);
  const { error } = await client.storage.from(BUCKET).upload(`${request.id}.json`, JSON.stringify(request), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw error;
}

async function readOne(client: SupabaseClient | null, name: string): Promise<OnlineRequest | null> {
  if (!client) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(folder(), name), "utf8")) as unknown;
      return isRequest(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  const { data, error } = await client.storage.from(BUCKET).download(name);
  if (error || !data) return null;
  try {
    const parsed = JSON.parse(await data.text()) as unknown;
    return isRequest(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function listOnlineRequests(): Promise<OnlineRequest[]> {
  const client = remote();
  const names = client
    ? (await (async () => {
        await ensureBucket(client);
        const { data, error } = await client.storage.from(BUCKET).list("", { limit: 200 });
        if (error) throw error;
        return (data ?? []).map((file) => file.name).filter((name) => name.endsWith(".json"));
      })())
    : fs.existsSync(folder())
      ? fs.readdirSync(folder()).filter((name) => name.endsWith(".json"))
      : [];
  const rows = await Promise.all(names.map((name) => readOne(client, name)));
  return rows
    .filter((row): row is OnlineRequest => Boolean(row))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function markOnlineRequestSeen(id: string) {
  const safe = id.replace(/[^a-zA-Z0-9-]/g, "");
  if (!safe) throw new Error("Demande introuvable.");
  const client = remote();
  const current = await readOne(client, `${safe}.json`);
  if (!current) throw new Error("Demande introuvable.");
  const next = { ...current, seenAt: current.seenAt ?? new Date().toISOString() };
  if (!client) {
    fs.writeFileSync(path.join(folder(), `${safe}.json`), JSON.stringify(next));
    return next;
  }
  const { error } = await client.storage.from(BUCKET).upload(`${safe}.json`, JSON.stringify(next), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw error;
  return next;
}

