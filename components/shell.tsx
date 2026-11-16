"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { useGarage } from "@/components/garage-provider";
import { badgeFor, people } from "@/lib/selectors";
import { roleLabel } from "@/lib/talk";
import { ROLES, type Role } from "@/lib/types";

const LINKS: Record<Role, { href: string; label: string; match: (path: string) => boolean }[]> = {
  reception: [
    { href: "/", label: "Dossiers", match: (path) => path === "/" },
    { href: "/nouveau", label: "Nouvel ordre", match: (path) => path.startsWith("/nouveau") },
  ],
  atelier: [{ href: "/", label: "Atelier", match: (path) => path === "/" || path.startsWith("/dossier") }],
  comptabilite: [
    { href: "/", label: "À traiter", match: (path) => path === "/" || path.startsWith("/dossier") },
    { href: "/grille", label: "Grille et stock", match: (path) => path.startsWith("/grille") },
  ],
  achats: [{ href: "/", label: "À acheter", match: () => true }],
  direction: [{ href: "/", label: "Dossiers", match: (path) => path === "/" || path.startsWith("/dossier") }],
  client: [{ href: "/", label: "Mes voitures", match: () => true }],
};

export function Shell({ children }: { children: ReactNode }) {
  const { state, loading, error, refresh } = useGarage();

  if (loading && !state) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Liquid />
        <p className="stage quiet">Ouverture des dossiers…</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <Liquid />
        <div className="stage glass max-w-md p-8 text-center">
          <h1 className="display text-[2rem]">Dossiers inaccessibles</h1>
          <p className="quiet mt-3">{error}</p>
          <button className="btn mt-5" type="button" onClick={() => refresh().catch(() => undefined)}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <Liquid />
      <div className="stage">
        <header className="no-print sticky top-0 z-20 px-3 pt-3 md:px-6">
          <TopBar />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:px-8">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}

function Liquid() {
  return (
    <div className="liquid" aria-hidden>
      <i />
      <i />
      <i />
    </div>
  );
}

function TopBar() {
  const path = usePathname();
  const { state, role, setRole, clientId, setClientId, actorId, setActor, reset } = useGarage();
  const [confirm, setConfirm] = useState(false);
  if (!state) return null;
  const links = LINKS[role];
  const team = role === "client" ? [] : people(state, role);

  return (
    <div className="glass topbar px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.jpg" alt="" width={36} height={36} className="size-9 rounded-xl object-cover" />
          <span>
            <strong className="block leading-none">Auto HR</strong>
            <small className="quiet">{state.settings.city}</small>
          </span>
        </Link>
        <div className="flex gap-1 overflow-auto">
          {ROLES.map((item) => {
            const count = badgeFor(state, item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => setRole(item)}
                className={cn("rounded-full px-3 py-1.5 text-sm", role === item ? "bg-[#17191c] text-white" : "text-[#5d656e]")}
              >
                {roleLabel(item)}
                {count > 0 ? <span className="ml-1 opacity-70">{count}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <nav className="hidden gap-1 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={cn("rounded-full px-3 py-1.5 text-sm", link.match(path) ? "bg-white/80" : "quiet")}>
              {link.label}
            </Link>
          ))}
        </nav>
        {role === "client" ? (
          <select className="field !w-auto" value={clientId} onChange={(event) => setClientId(event.target.value)}>
            {state.clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.company || client.name}
              </option>
            ))}
          </select>
        ) : team.length > 1 ? (
          <select className="field !w-auto" value={actorId} onChange={(event) => setActor(event.target.value)}>
            {team.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} · {person.post}
              </option>
            ))}
          </select>
        ) : (
          <p className="quiet text-sm">{team[0] ? `${team[0].name} · ${team[0].post}` : null}</p>
        )}
        <button type="button" className="btn-ghost ml-auto" onClick={() => setConfirm((open) => !open)}>
          Exemples
        </button>
      </div>
      <div className={cn("fold", confirm && "open")}>
        <div>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-white/50 p-3">
            <p className="text-sm">Revenir aux dossiers d’exemple ? Les saisies de cette session seront effacées.</p>
            <button type="button" className="btn" onClick={() => { setConfirm(false); reset().catch(() => undefined); }}>
              Restaurer
            </button>
            <button type="button" className="btn-line" onClick={() => setConfirm(false)}>
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomNav() {
  const path = usePathname();
  const { role } = useGarage();
  const links = LINKS[role];
  return (
    <nav className="dock glass no-print md:hidden">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className={link.match(path) ? "on" : ""}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
