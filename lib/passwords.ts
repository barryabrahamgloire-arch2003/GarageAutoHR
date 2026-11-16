import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, encoded: string) {
  const [kind, salt, hash] = encoded.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const check = scryptSync(password, salt, 32);
  const stored = Buffer.from(hash, "hex");
  if (stored.length !== check.length) return false;
  return timingSafeEqual(stored, check);
}
