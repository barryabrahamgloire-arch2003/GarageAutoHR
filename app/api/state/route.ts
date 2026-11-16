import { connection } from "next/server";
import { visibleState } from "@/lib/platform";
import { principalFrom } from "@/lib/principal";
import { garageOf } from "@/lib/store";

export async function GET(request: Request) {
  await connection();
  const principal = await principalFrom(request);
  if (!principal) return Response.json({ error: "Connexion requise." }, { status: 401 });
  const garage = garageOf(principal.platform, principal.account.garageId);
  if (!garage) return Response.json({ error: "Aucun garage n’est associé à ce compte." }, { status: 403 });
  return Response.json(visibleState(garage.state, principal.account), {
    headers: { "Cache-Control": "no-store" },
  });
}
