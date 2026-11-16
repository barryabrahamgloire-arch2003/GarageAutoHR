import { connection } from "next/server";
import { principalFrom } from "@/lib/principal";
import { issueSession, sessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  await connection();
  const principal = await principalFrom(request);
  if (!principal || principal.real.role !== "superadmin") {
    return Response.json({ error: "Réservé au superadmin." }, { status: 403 });
  }
  let body: { accountId?: string; stop?: boolean } = {};
  try {
    body = (await request.json()) as { accountId?: string; stop?: boolean };
  } catch {
    return Response.json({ error: "Requête illisible." }, { status: 400 });
  }
  if (body.stop) {
    const token = issueSession({ accountId: principal.real.id });
    return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(token) } });
  }
  const target = principal.platform.accounts.find((account) => account.id === body.accountId && account.active);
  if (!target || target.role === "superadmin") {
    return Response.json({ error: "Ce membre ne peut pas être ouvert." }, { status: 400 });
  }
  const token = issueSession({ accountId: target.id, impersonatorId: principal.real.id });
  return Response.json(
    { ok: true, role: target.role },
    { headers: { "Cache-Control": "no-store", "Set-Cookie": sessionCookie(token) } },
  );
}

