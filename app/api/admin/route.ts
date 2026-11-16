import { randomUUID } from "crypto";
import { connection } from "next/server";
import { spaceLabel, type SpaceRole } from "@/lib/accounts";
import { hashPassword } from "@/lib/passwords";
import { emptyGarageState, publicAccount, slugify } from "@/lib/platform";
import { principalFrom } from "@/lib/principal";
import { resetPlatform, updatePlatform } from "@/lib/store";
import { ROLES } from "@/lib/types";

const ROLES_AND_ADMIN: SpaceRole[] = [...ROLES, "superadmin"];

function denied() {
  return Response.json({ error: "Réservé au superadmin." }, { status: 403 });
}

export async function GET(request: Request) {
  await connection();
  const principal = await principalFrom(request);
  if (!principal || principal.real.role !== "superadmin") return denied();
  return Response.json(directory(principal.platform), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  await connection();
  const principal = await principalFrom(request);
  if (!principal || principal.real.role !== "superadmin") return denied();
  let body: {
    type?: string;
    name?: string;
    city?: string;
    phone?: string;
    email?: string;
    role?: SpaceRole;
    garageId?: string;
    password?: string;
    clientId?: string;
    directorName?: string;
    directorEmail?: string;
    directorPassword?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Requête illisible." }, { status: 400 });
  }

  try {
    if (body.type === "resetDemo") {
      const platform = await resetPlatform();
      return Response.json(directory(platform));
    }
    if (body.type === "createGarage") {
      const name = body.name?.trim() ?? "";
      const city = body.city?.trim() ?? "";
      const phone = body.phone?.trim() ?? "";
      const directorName = body.directorName?.trim() ?? "";
      const directorEmail = body.directorEmail?.trim().toLowerCase() ?? "";
      const directorPassword = body.directorPassword ?? "";
      if (!name || !city || !directorName || !directorEmail || directorPassword.length < 8) {
        return Response.json({ error: "Nom, ville, et le compte directeur (8 caractères minimum) sont requis." }, { status: 400 });
      }
      const platform = await updatePlatform((current) => {
        if (current.accounts.some((account) => account.email.toLowerCase() === directorEmail)) {
          throw new Error("Cet e-mail est déjà utilisé.");
        }
        const id = `g_${randomUUID().slice(0, 8)}`;
        const base = slugify(name);
        const slug = current.garages.some((garage) => garage.slug === base) ? `${base}-${id.slice(2)}` : base;
        const state = emptyGarageState(name, city, phone);
        const staffId = `s_${randomUUID().slice(0, 8)}`;
        state.staff.push({ id: staffId, name: directorName, role: "direction", post: "Direction", phone });
        current.garages.push({ id, name, slug, state });
        current.accounts.push({
          id: `acc_${randomUUID().slice(0, 8)}`,
          email: directorEmail,
          name: directorName,
          passwordHash: hashPassword(directorPassword),
          role: "direction",
          garageId: id,
          staffId,
          clientId: null,
          active: true,
        });
      });
      return Response.json(directory(platform));
    }
    if (body.type === "createAccount") {
      const email = body.email?.trim().toLowerCase() ?? "";
      const name = body.name?.trim() ?? "";
      const role = body.role;
      const garageId = body.garageId ?? "";
      const password = body.password ?? "";
      if (!email || !name || !role || !ROLES_AND_ADMIN.includes(role) || password.length < 8) {
        return Response.json({ error: "E-mail, nom, rôle et mot de passe (8 caractères) sont requis." }, { status: 400 });
      }
      if (role !== "superadmin" && !garageId) {
        return Response.json({ error: "Choisissez le garage de ce membre." }, { status: 400 });
      }
      const platform = await updatePlatform((current) => {
        if (current.accounts.some((account) => account.email.toLowerCase() === email)) {
          throw new Error("Cet e-mail est déjà utilisé.");
        }
        const garage = current.garages.find((item) => item.id === garageId);
        if (role !== "superadmin" && !garage) throw new Error("Garage introuvable.");
        let staffId: string | null = null;
        if (garage && role !== "client" && role !== "superadmin") {
          staffId = `s_${randomUUID().slice(0, 8)}`;
          garage.state.staff.push({ id: staffId, name, role, post: spaceLabel(role), phone: "" });
        }
        if (role === "client" && garage && !garage.state.clients.some((client) => client.id === body.clientId)) {
          throw new Error("Choisissez un client du garage.");
        }
        current.accounts.push({
          id: `acc_${randomUUID().slice(0, 8)}`,
          email,
          name,
          passwordHash: hashPassword(password),
          role,
          garageId: role === "superadmin" ? null : garageId,
          staffId,
          clientId: role === "client" ? body.clientId?.trim() || null : null,
          active: true,
        });
      });
      return Response.json(directory(platform));
    }
    return Response.json({ error: "Action inconnue." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Action impossible." }, { status: 400 });
  }
}

function directory(platform: Awaited<ReturnType<typeof resetPlatform>>) {
  return {
    garages: platform.garages.map((garage) => ({
      id: garage.id,
      name: garage.name,
      slug: garage.slug,
      city: garage.state.settings.city,
      phone: garage.state.settings.phone,
      dossiers: garage.state.dossiers.length,
      members: platform.accounts.filter((account) => account.garageId === garage.id).length,
      clients: garage.state.clients.map((client) => ({ id: client.id, name: client.company || client.name })),
    })),
    accounts: platform.accounts.map(publicAccount),
  };
}
