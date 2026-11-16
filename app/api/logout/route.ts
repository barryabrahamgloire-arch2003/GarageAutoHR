import { connection } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export async function POST() {
  await connection();
  return Response.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store", "Set-Cookie": clearSessionCookie() } },
  );
}
