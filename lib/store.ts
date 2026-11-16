import fs from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { applyAction, DomainError } from "./domain";
import {
  createPlatform,
  normalizeState,
  type Account,
  type GarageWorkspace,
  type Platform,
} from "./platform";
import type { Action, State } from "./types";

function dataFile() {
  const preferred = path.join(process.cwd(), "data");
  try {
    fs.mkdirSync(preferred, { recursive: true });
    fs.accessSync(preferred, fs.constants.W_OK);
    return path.join(preferred, "garage.json");
  } catch {
    const fallback = path.join("/tmp", "garage-auto-hr");
    fs.mkdirSync(fallback, { recursive: true });
    return path.join(fallback, "garage.json");
  }
}

const file = dataFile();

function isState(value: unknown): value is State {
  if (!value || typeof value !== "object") return false;
  const parsed = value as { version?: number; dossiers?: unknown };
  return (parsed.version === 2 || parsed.version === 3) && Array.isArray(parsed.dossiers);
}

function isPlatform(value: unknown): value is Platform {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Partial<Platform>;
  return parsed.version === 4 && Array.isArray(parsed.garages) && Array.isArray(parsed.accounts);
}

export function normalizePlatform(value: unknown): Platform {
  if (isPlatform(value)) {
    return {
      version: 4,
      accounts: value.accounts,
      garages: value.garages.map((garage) => ({
        ...garage,
        state: normalizeState(garage.state),
      })),
    };
  }
  if (isState(value)) {
    const seeded = createPlatform();
    return {
      ...seeded,
      garages: seeded.garages.map((garage, index) =>
        index === 0 ? { ...garage, state: normalizeState(value) } : garage,
      ),
    };
  }
  throw new Error("schema");
}

function read(): Platform {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
    const platform = normalizePlatform(parsed);
    if (!isPlatform(parsed)) writeSync(platform);
    return platform;
  } catch (error) {
    if (error instanceof Error && error.message !== "schema" && !(error instanceof SyntaxError) && !("code" in (error as object))) {
      throw error;
    }
    const seed = createPlatform();
    writeSync(seed);
    return seed;
  }
}

function writeSync(platform: Platform) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(platform));
  fs.renameSync(temporary, file);
}

let queue: Promise<void> = Promise.resolve();

function remote(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function readRemote(client: SupabaseClient): Promise<Platform> {
  const { data, error } = await client.from("garage_state").select("payload").eq("id", 1).maybeSingle();
  if (error) throw error;
  if (!data?.payload) {
    const seed = createPlatform();
    await writeRemote(client, seed);
    return seed;
  }
  try {
    const platform = normalizePlatform(data.payload);
    if (!isPlatform(data.payload)) await writeRemote(client, platform);
    return platform;
  } catch {
    const seed = createPlatform();
    await writeRemote(client, seed);
    return seed;
  }
}

async function writeRemote(client: SupabaseClient, platform: Platform) {
  const { error } = await client.from("garage_state").upsert({
    id: 1,
    payload: platform,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function loadPlatform(): Promise<Platform> {
  const client = remote();
  if (client) return readRemote(client);
  return read();
}

async function savePlatform(platform: Platform) {
  const client = remote();
  if (client) {
    await writeRemote(client, platform);
    return;
  }
  writeSync(platform);
}

export async function resetPlatform() {
  const seed = createPlatform();
  await savePlatform(seed);
  return seed;
}

export function updatePlatform(mutate: (platform: Platform) => void) {
  const job = queue.then(async () => {
    const platform = await loadPlatform();
    mutate(platform);
    await savePlatform(platform);
    return platform;
  });
  queue = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}

export function dispatchAction(action: Action, garageId: string) {
  const job = queue.then(async () => {
    const platform = await loadPlatform();
    const garage = platform.garages.find((item) => item.id === garageId);
    if (!garage) throw new DomainError("Ce garage est introuvable.");
    garage.state = applyAction(garage.state, action);
    await savePlatform(platform);
    return garage.state;
  });
  queue = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}

export function garageOf(platform: Platform, garageId: string | null): GarageWorkspace | null {
  if (!garageId) return null;
  return platform.garages.find((garage) => garage.id === garageId) ?? null;
}

export function accountByEmail(platform: Platform, email: string): Account | undefined {
  const needle = email.trim().toLowerCase();
  return platform.accounts.find((account) => account.email.toLowerCase() === needle);
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
