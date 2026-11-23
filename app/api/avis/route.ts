import { connection } from "next/server";
import { isReviewHoneypot, parseReview, saveReview } from "@/lib/reviews";

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
    return Response.json({ error: "Avis illisible." }, { status: 400, headers });
  }
  if (isReviewHoneypot(body)) return Response.json({ ok: true }, { headers });
  try {
    await saveReview(parseReview(body));
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Envoi impossible.";
    const status = /Indiquez|Notez|Écrivez|illisible/.test(message) ? 400 : 500;
    return Response.json({ error: message }, { status, headers });
  }
}
