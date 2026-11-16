import { connection } from "next/server";
import { principalFrom, profileOf } from "@/lib/principal";

export async function GET(request: Request) {
  await connection();
  const principal = await principalFrom(request);
  if (!principal) return Response.json({ error: "Connexion requise." }, { status: 401 });
  return Response.json(profileOf(principal), { headers: { "Cache-Control": "no-store" } });
}
