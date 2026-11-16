import fs from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { applyAction, DomainError } from "./domain";
import { createSeed } from "./seed";
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

function normalize(state: State): State {
  return {
    ...state,
    version: 3,
    dossiers: state.dossiers.map((dossier) => ({
      ...dossier,
      clientStatus: dossier.clientStatus === undefined ? dossier.status : dossier.clientStatus,
      notes: (dossier.notes ?? []).map((note) => ({ ...note, kind: note.kind ?? "note" })),
    })),
  };
}

function read(): State {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Omit<State, "version"> & { version?: number };
    if (!parsed || (parsed.version !== 2 && parsed.version !== 3) || !Array.isArray(parsed.dossiers)) {
      throw new Error("schema");
    }
    return normalize(parsed as State);
  } catch {
    const seed = createSeed();
    writeSync(seed);
    return seed;
  }
}

function writeSync(state: State) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(state));
  fs.renameSync(temporary, file);
}

let queue: Promise<void> = Promise.resolve();

function remote(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function readRemote(client: SupabaseClient): Promise<State> {
  const { data, error } = await client.from("garage_state").select("payload").eq("id", 1).maybeSingle();
  if (error) throw error;
  const payload = data?.payload as State | undefined;
  if (!payload || !Array.isArray(payload.dossiers)) {
    const seed = createSeed();
    await writeRemote(client, seed);
    return seed;
  }
  return normalize(payload);
}

async function writeRemote(client: SupabaseClient, state: State) {
  const { error } = await client.from("garage_state").upsert({
    id: 1,
    payload: state,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

async function load(): Promise<State> {
  const client = remote();
  if (client) return readRemote(client);
  return read();
}

async function save(state: State) {
  const client = remote();
  if (client) {
    await writeRemote(client, state);
    return;
  }
  writeSync(state);
}

export async function getState() {
  return load();
}

export async function resetState() {
  const seed = createSeed();
  await save(seed);
  return seed;
}

export function dispatchAction(action: Action) {
  const job = queue.then(async () => {
    const next = applyAction(await load(), action);
    await save(next);
    return next;
  });
  queue = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
