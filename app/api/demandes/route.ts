import { connection } from "next/server";
import { principalFrom } from "@/lib/principal";
import {
  isHoneypot,
  listOnlineRequests,
  markOnlineRequestSeen,
  parseOnlineRequest,
  saveOnlineRequest,
} from "@/lib/online-requests";

const ORIGINS = new Set([
  "https://www.garageautohrco.com",
  "https://garageautohrco.com",
  "http://127.0.0.1:8080",
  "http://localhost:8080",
]);

function cors(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const allow = ORIGINS.has(origin) ? origin : "https://www.garageautohrco.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: cors(request) });
}

export async function POST(request: Request) {
  await connection();
  const headers = cors(request);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Demande illisible." }, { status: 400, headers });
  }
  if (isHoneypot(body)) return Response.json({ ok: true, emailed: true }, { headers });
  try {
    const demande = parseOnlineRequest(body);
    await saveOnlineRequest(demande);
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Envoi impossible.";
    const status = /Indiquez|valide|illisible/.test(message) ? 400 : 500;
    return Response.json({ error: message }, { status, headers });
  }
}

export async function GET(request: Request) {
  await connection();
  const principal = await principalFrom(request);
  if (!principal || principal.account.role !== "reception") {
    return Response.json({ error: "Réservé à la réception." }, { status: 403 });
  }
  const demandes = await listOnlineRequests();
  return Response.json({ demandes }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  await connection();
  const principal = await principalFrom(request);
  if (!principal || principal.account.role !== "reception") {
    return Response.json({ error: "Réservé à la réception." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  try {
    const demande = await markOnlineRequestSeen(String(body?.id ?? ""));
    return Response.json({ demande });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Demande introuvable." }, { status: 404 });
  }
}
