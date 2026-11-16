import { connection } from "next/server";
import { resetState } from "@/lib/store";

export async function POST() {
  await connection();
  return Response.json(await resetState(), {
    headers: { "Cache-Control": "no-store" },
  });
}
