"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { useGarage } from "@/components/garage-provider";
import { spaceLabel } from "@/lib/accounts";
import type { Role } from "@/lib/types";

const LINKS: Record<Role, { href: string; label: string; match: (path: string) => boolean }[]> = {
  reception: [
    { href: "/", label: "Accueil", match: (path) => path === "/" },
    { href: "/demandes", label: "Demandes", match: (path) => path.startsWith("/demandes") },
    { href: "/nouveau", label: "Nouvel ordre", match: (path) => path.startsWith("/nouveau") },
  ],
  atelier: [{ href: "/", label: "Atelier", match: (path) => path === "/" || path.startsWith("/dossier") }],
  comptabilite: [
    { href: "/", label: "Accueil", match: (path) => path === "/" || path.startsWith("/dossier") },
    { href: "/grille", label: "Grille", match: (path) => path.startsWith("/grille") },
  ],
  achats: [{ href: "/", label: "À acheter", match: () => true }],
  direction: [{ href: "/", label: "Dossiers", match: (path) => path === "/" || path.startsWith("/dossier") }],
  client: [{ href: "/", label: "Mes voitures", match: () => true }],
};

export function Shell({ children }: { children: ReactNode }) {
  const { state, profile, loading, error, refresh } = useGarage();

  if (loading && !state) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <p className="quiet">Ouverture de l’espace…</p>
      </div>
    );
  }

  if (!state || !profile) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <div className="glass max-w-md p-8 text-center">
          <Image src="/logo.jpg" alt="Garage Auto HR" width={72} height={72} className="mx-auto rounded-2xl" />
          <h1 className="mt-4 text-2xl font-bold">Espace inaccessible</h1>
          <p className="quiet mt-3">{error || "Reconnectez-vous pour ouvrir votre interface."}</p>
          <button className="btn mt-5" type="button" onClick={() => refresh().catch(() => undefined)}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-frame">
      <Sidebar />
      <div className="app-main">
        {profile.impersonating ? <ImpersonationBanner name={profile.name} role={profile.role} /> : null}
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

function Sidebar() {
  const path = usePathname();
  const { state, profile, role, logout } = useGarage();
  if (!state || !profile) return null;
  return (
    <aside className="sidebar no-print">
      <Link href="/" className="side-brand">
        <Image src="/logo.jpg" alt="" width={52} height={52} />
        <span>
          <strong>Garage Auto HR</strong>
          <small>{state.settings.city}</small>
        </span>
      </Link>
      <nav className="side-nav" aria-label="Espace">
        {LINKS[role].map((link) => (
          <Link key={link.href} href={link.href} className={cn("side-link", link.match(path) && "on")}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="side-user">
        <strong>{profile.name}</strong>
        <small>{spaceLabel(role)}</small>
        <button className="btn-line" type="button" onClick={() => logout().catch(() => undefined)}>
          Sortir
        </button>
      </div>
    </aside>
  );
}

function BottomNav() {
  const path = usePathname();
  const { role } = useGarage();
  return (
    <nav className="tabbar no-print" aria-label="Menu">
      {LINKS[role].map((link) => (
        <Link key={link.href + link.label} href={link.href} className={link.match(path) ? "on" : ""}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function ImpersonationBanner({ name, role }: { name: string; role: Role | "superadmin" }) {
  const { stopImpersonation } = useGarage();
  return (
    <div className="impersonate no-print">
      <p>Interface de {name} · {spaceLabel(role)}</p>
      <button className="btn" type="button" onClick={() => stopImpersonation().catch(() => undefined)}>
        Quitter
      </button>
    </div>
  );
}
