import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "gahr_session";
const MAX_AGE = 60 * 60 * 12;

export interface SessionToken {
  accountId: string;
  impersonatorId?: string;
  exp: number;
}

function secret() {
  return process.env.SESSION_SECRET || "dev-garage-auto-hr-session";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function issueSession(token: Omit<SessionToken, "exp"> & { exp?: number }) {
  const body: SessionToken = {
    accountId: token.accountId,
    impersonatorId: token.impersonatorId,
    exp: token.exp ?? Date.now() + MAX_AGE * 1000,
  };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySession(value: string | undefined | null): SessionToken | null {
  if (!value) return null;
  const [payload, mac] = value.split(".");
  if (!payload || !mac) return null;
  const expected = sign(payload);
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionToken;
    if (!parsed.accountId || typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readCookie(header: string | null, name: string) {
  if (!header) return "";
  const found = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  if (!found) return "";
  return decodeURIComponent(found.slice(name.length + 1));
}

export function sessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
}
