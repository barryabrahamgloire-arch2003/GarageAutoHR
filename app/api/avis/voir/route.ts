import { connection } from "next/server";
import { codeMatches, listReviews } from "@/lib/reviews";

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
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  if (!codeMatches(body?.code)) {
    return Response.json({ error: "Code incorrect." }, { status: 401, headers });
  }
  const avis = await listReviews();
  return Response.json({ avis }, { headers });
}
