import { connection } from "next/server";
import { principalFrom } from "@/lib/principal";
import { resetPlatform } from "@/lib/store";

export async function POST(request: Request) {
  await connection();
  const principal = await principalFrom(request);
  if (!principal || principal.real.role !== "superadmin") {
    return Response.json({ error: "Réservé au superadmin." }, { status: 403 });
  }
  await resetPlatform();
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
