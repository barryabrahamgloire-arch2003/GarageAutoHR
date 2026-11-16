import { connection } from "next/server";
import { verifyPassword } from "@/lib/passwords";
import { accountByEmail, loadPlatform } from "@/lib/store";
import { issueSession, sessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  await connection();
  let email = "";
  let password = "";
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    email = body.email ?? "";
    password = body.password ?? "";
  } catch {
    return Response.json({ error: "Requête illisible." }, { status: 400 });
  }
  const account = accountByEmail(await loadPlatform(), email);
  if (!account || !account.active || !verifyPassword(password, account.passwordHash)) {
    return Response.json({ error: "Identifiants incorrects." }, { status: 401 });
  }
  const token = issueSession({ accountId: account.id });
  return Response.json(
    { ok: true, role: account.role },
    { headers: { "Cache-Control": "no-store", "Set-Cookie": sessionCookie(token) } },
  );
}
