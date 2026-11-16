import { connection } from "next/server";
import { DomainError } from "@/lib/domain";
import { dispatchAction } from "@/lib/store";
import type { Action } from "@/lib/types";

export async function POST(request: Request) {
  await connection();
  let action: Action;
  try {
    action = (await request.json()) as Action;
  } catch {
    return Response.json({ error: "Requête illisible." }, { status: 400 });
  }
  try {
    const state = await dispatchAction(action);
    return Response.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof DomainError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return Response.json({ error: "L'action n'a pas pu être enregistrée." }, { status: 500 });
  }
}
