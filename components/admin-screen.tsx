"use client";

import { useEffect, useState } from "react";
import { Count, NumberFlowGroup } from "@/components/figures";
import Image from "next/image";
import { useRouter } from "next/navigation";
import logoutIcon from "@iconify-icons/line-md/logout";
import plus from "@iconify-icons/line-md/plus";
import accountAdd from "@iconify-icons/line-md/account-add";
import backup from "@iconify-icons/line-md/backup-restore";
import login from "@iconify-icons/line-md/login";
import checkAll from "@iconify-icons/line-md/check-all";
import { MotionIcon } from "@/components/motion-icon";
import { Popup } from "@/components/popup";
import { DEMO_PASSWORD, spaceLabel, type SpaceRole } from "@/lib/accounts";
import { ROLES } from "@/lib/types";

interface GarageRow {
  id: string;
  name: string;
  slug: string;
  city: string;
  phone: string;
  dossiers: number;
  members: number;
  clients: { id: string; name: string }[];
}

interface AccountRow {
  id: string;
  email: string;
  name: string;
  role: SpaceRole;
  garageId: string | null;
  active: boolean;
}

interface Directory {
  garages: GarageRow[];
  accounts: AccountRow[];
}

const EMPTY_GARAGE = { name: "", city: "", phone: "", directorName: "", directorEmail: "", directorPassword: "" };
const EMPTY_MEMBER = { name: "", email: "", role: "reception" as SpaceRole, garageId: "", password: "", clientId: "" };

export function AdminScreen() {
  const router = useRouter();
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [garageForm, setGarageForm] = useState(EMPTY_GARAGE);
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER);
  const [garageOpen, setGarageOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [pending, setPending] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          router.push("/connexion");
          return null;
        }
        if (response.status === 403) {
          router.push("/");
          return null;
        }
        if (!response.ok) throw new Error("La plateforme n’a pas pu être lue.");
        return (await response.json()) as Directory;
      })
      .then((data) => {
        if (!cancelled && data) setDirectory(data);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Lecture impossible.");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function send(body: object, key: string) {
    setPending(key);
    setError("");
    setNotice("");
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => null)) as Directory & { error?: string } | null;
    setPending("");
    if (!response.ok || !data || !("garages" in data)) {
      setError(data?.error || "Action impossible.");
      return;
    }
    setDirectory(data);
    setNotice("Enregistré.");
  }

  async function impersonate(accountId: string) {
    setPending(accountId);
    const response = await fetch("/api/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    setPending("");
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Ouverture impossible.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (!directory) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#f3efe8]">
        <p className="quiet">{error || "Ouverture de la plateforme…"}</p>
      </div>
    );
  }

  const selectedGarage = directory.garages.find((garage) => garage.id === memberForm.garageId);

  return (
    <div className="admin-frame">
      <header className="admin-bar">
        <Image src="/logo.png" alt="" width={48} height={48} className="logo-tile" />
        <div>
          <strong className="block leading-none">Garage Auto HR</strong>
          <small className="text-[#b7aea4]">Superadmin</small>
        </div>
        <button className="btn-line" type="button" onClick={() => fetch("/api/logout", { method: "POST" }).then(() => router.push("/connexion"))}>
          <MotionIcon icon={logoutIcon} />
          <span>Sortir</span>
        </button>
      </header>
      <div className="admin-body">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Plateforme</h1>
          <p className="quiet mt-1">Les garages, leurs membres, et l’interface de chacun.</p>
        </header>

        <NumberFlowGroup>
          <p className="kpi-row">
            <span><strong><Count value={directory.garages.length} /></strong>Garages</span>
            <span><strong><Count value={directory.accounts.length} /></strong>Membres</span>
            <span><strong><Count value={directory.garages.reduce((sum, garage) => sum + garage.dossiers, 0)} /></strong>Dossiers</span>
          </p>
        </NumberFlowGroup>

        {error ? <p className="text-sm text-[#8d3a32]">{error}</p> : null}
        {notice ? <p className="text-sm">{notice}</p> : null}

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="glass grid gap-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg">Garages</h2>
              <button className="btn" type="button" onClick={() => setGarageOpen(true)}><MotionIcon icon={plus} /><span>Nouveau garage</span></button>
            </div>
            <Popup open={garageOpen} title="Nouveau garage" onClose={() => setGarageOpen(false)}>
              <div className="grid gap-3">
            <Field label="Nom" value={garageForm.name} onChange={(name) => setGarageForm({ ...garageForm, name })} />
            <Field label="Ville" value={garageForm.city} onChange={(city) => setGarageForm({ ...garageForm, city })} />
            <Field label="Téléphone" value={garageForm.phone} onChange={(phone) => setGarageForm({ ...garageForm, phone })} />
            <Field label="Directeur" value={garageForm.directorName} onChange={(directorName) => setGarageForm({ ...garageForm, directorName })} />
            <Field label="E-mail du directeur" value={garageForm.directorEmail} onChange={(directorEmail) => setGarageForm({ ...garageForm, directorEmail })} />
            <Field label="Mot de passe" value={garageForm.directorPassword} onChange={(directorPassword) => setGarageForm({ ...garageForm, directorPassword })} type="password" />
            <button className="btn" type="button" disabled={pending === "garage"} onClick={() => send({ type: "createGarage", ...garageForm }, "garage").then(() => { setGarageForm(EMPTY_GARAGE); setGarageOpen(false); })}>
              <MotionIcon icon={checkAll} /><span>Créer le garage</span>
            </button>
              </div>
            </Popup>
            <div className="grid gap-2">
              {directory.garages.map((garage) => (
                <article key={garage.id} className="rounded-2xl bg-white/50 p-4">
                  <strong>{garage.name}</strong>
                  <p className="quiet text-sm">{garage.city} · {garage.dossiers} dossiers · {garage.members} membres</p>
                </article>
              ))}
            </div>
          </section>

          <section className="glass grid gap-4 p-6">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-lg">Membres</h2>
              <button className="btn-ghost" type="button" disabled={pending === "reset"} onClick={() => send({ type: "resetDemo" }, "reset")}>
                <MotionIcon icon={backup} /><span>Restaurer l’exemple</span>
              </button>
            </div>
            <p className="hint">Mot de passe des comptes livrés : {DEMO_PASSWORD}</p>
            <div className="grid gap-2">
              {directory.accounts.map((account) => {
                const garage = directory.garages.find((item) => item.id === account.garageId);
                return (
                  <article key={account.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/50 p-4">
                    <div>
                      <strong>{account.name}</strong>
                      <p className="quiet text-sm">{spaceLabel(account.role)}{garage ? ` · ${garage.name}` : " · Plateforme"}</p>
                      <p className="hint">{account.email}</p>
                    </div>
                    {account.role === "superadmin" ? null : (
                      <button className="btn" type="button" disabled={pending === account.id} onClick={() => impersonate(account.id)}>
                        <MotionIcon icon={login} /><span>Ouvrir</span>
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
            <button className="btn w-fit" type="button" onClick={() => setMemberOpen(true)}><MotionIcon icon={accountAdd} /><span>Inviter</span></button>
            <Popup open={memberOpen} title="Inviter un membre" onClose={() => setMemberOpen(false)}>
              <div className="grid gap-3">
            <Field label="Nom" value={memberForm.name} onChange={(name) => setMemberForm({ ...memberForm, name })} autoComplete="name" />
            <Field label="E-mail" type="email" autoComplete="email" value={memberForm.email} onChange={(email) => setMemberForm({ ...memberForm, email })} />
            <label className="grid gap-1">
              <span className="label">Rôle</span>
              <select className="field" value={memberForm.role} onChange={(event) => setMemberForm({ ...memberForm, role: event.target.value as SpaceRole })}>
                {ROLES.map((role) => <option key={role} value={role}>{spaceLabel(role)}</option>)}
                <option value="superadmin">Superadmin</option>
              </select>
            </label>
            {memberForm.role === "superadmin" ? null : (
              <label className="grid gap-1">
                <span className="label">Garage</span>
                <select className="field" value={memberForm.garageId} onChange={(event) => setMemberForm({ ...memberForm, garageId: event.target.value, clientId: "" })}>
                  <option value="">Choisir</option>
                  {directory.garages.map((garage) => <option key={garage.id} value={garage.id}>{garage.name}</option>)}
                </select>
              </label>
            )}
            {memberForm.role === "client" ? (
              <label className="grid gap-1">
                <span className="label">Client du garage</span>
                <select className="field" value={memberForm.clientId} onChange={(event) => setMemberForm({ ...memberForm, clientId: event.target.value })}>
                  <option value="">Choisir</option>
                  {(selectedGarage?.clients ?? []).map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
              </label>
            ) : null}
            <Field label="Mot de passe" value={memberForm.password} onChange={(password) => setMemberForm({ ...memberForm, password })} type="password" autoComplete="new-password" />
            <button className="btn" type="button" disabled={pending === "member"} onClick={() => send({ type: "createAccount", ...memberForm }, "member").then(() => { setMemberForm(EMPTY_MEMBER); setMemberOpen(false); })}>
              <MotionIcon icon={checkAll} /><span>Créer le compte</span>
            </button>
              </div>
            </Popup>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string }) {
  return (
    <label className="grid gap-1">
      <span className="label">{label}</span>
      <input className="field" type={type} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
