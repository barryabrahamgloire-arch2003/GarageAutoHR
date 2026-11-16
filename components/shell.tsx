"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { Liquid } from "@/components/liquid";
import { useGarage } from "@/components/garage-provider";
import { spaceLabel } from "@/lib/accounts";
import type { Role } from "@/lib/types";

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
  const { state, profile, loading, error, refresh } = useGarage();

  if (loading && !state) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Liquid />
        <p className="stage quiet">Ouverture de l’espace…</p>
      </div>
    );
  }

  if (!state || !profile) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <Liquid />
        <div className="stage glass max-w-md p-8 text-center">
          <h1 className="display text-[2rem]">Espace inaccessible</h1>
          <p className="quiet mt-3">{error || "Reconnectez-vous pour ouvrir votre interface."}</p>
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
        {profile.impersonating ? <ImpersonationBanner name={profile.name} role={profile.role} /> : null}
        <header className="no-print sticky top-0 z-20 px-3 pt-3 md:px-6">
          <TopBar />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:px-8">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}

function ImpersonationBanner({ name, role }: { name: string; role: Role | "superadmin" }) {
  const { stopImpersonation } = useGarage();
  return (
    <div className="impersonate no-print mx-3 mt-3 md:mx-6">
      <p>Vous voyez l’interface de {name} · {spaceLabel(role)}. Les actions sont les siennes.</p>
      <button className="btn !bg-white !text-[#17191c]" type="button" onClick={() => stopImpersonation().catch(() => undefined)}>
        Quitter
      </button>
    </div>
  );
}

function TopBar() {
  const path = usePathname();
  const { profile, role, garageName, logout } = useGarage();
  if (!profile) return null;
  const links = LINKS[role];
  return (
    <div className="glass topbar px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.jpg" alt="" width={36} height={36} className="size-9 rounded-xl object-cover" />
          <span>
            <strong className="block leading-none">{garageName}</strong>
            <small className="quiet">{spaceLabel(role)}</small>
          </span>
        </Link>
        <nav className="hidden gap-1 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={cn("rounded-full px-3 py-1.5 text-sm", link.match(path) ? "bg-white/80" : "quiet")}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <p className="hidden text-sm sm:block">{profile.name}</p>
          <button className="btn-line" type="button" onClick={() => logout().catch(() => undefined)}>
            Sortir
          </button>
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
        <Link key={link.href + link.label} href={link.href} className={link.match(path) ? "on" : ""}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
