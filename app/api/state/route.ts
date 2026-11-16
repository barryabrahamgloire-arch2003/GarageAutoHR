import { connection } from "next/server";
import { getState } from "@/lib/store";

export async function GET() {
  await connection();
  return Response.json(await getState(), {
    headers: { "Cache-Control": "no-store" },
  });
}
