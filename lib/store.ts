import fs from "fs";
import path from "path";
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

function read(): State {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as State;
    if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.dossiers)) {
      throw new Error("schema");
    }
    return parsed;
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

export function getState() {
  return read();
}

export function resetState() {
  const seed = createSeed();
  writeSync(seed);
  return seed;
}

export function dispatchAction(action: Action) {
  const job = queue.then(() => {
    const next = applyAction(read(), action);
    writeSync(next);
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
