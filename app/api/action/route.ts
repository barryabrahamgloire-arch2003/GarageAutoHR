import { connection } from "next/server";
import { DomainError } from "@/lib/domain";
import { canPerform, stampActor, visibleState } from "@/lib/platform";
import { principalFrom } from "@/lib/principal";
import { dispatchAction, isDomainError } from "@/lib/store";
import type { Action } from "@/lib/types";

export async function POST(request: Request) {
  await connection();
  const principal = await principalFrom(request);
  if (!principal) return Response.json({ error: "Connexion requise." }, { status: 401 });
  if (!principal.account.garageId) {
    return Response.json({ error: "Ce compte n’agit pas dans un garage." }, { status: 403 });
  }
  let action: Action;
  try {
    action = (await request.json()) as Action;
  } catch {
    return Response.json({ error: "Requête illisible." }, { status: 400 });
  }
  if (!action?.type || !canPerform(principal.account.role, action.type)) {
    return Response.json({ error: "Cette interface ne peut pas faire cette action." }, { status: 403 });
  }
  try {
    const state = await dispatchAction(stampActor(action, principal.account.name), principal.account.garageId);
    return Response.json(visibleState(state, principal.account), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof DomainError || isDomainError(error)) {
      return Response.json({ error: error instanceof Error ? error.message : "Action impossible." }, { status: 400 });
    }
    console.error(error);
    return Response.json({ error: "L'action n'a pas pu être enregistrée." }, { status: 500 });
  }
}
