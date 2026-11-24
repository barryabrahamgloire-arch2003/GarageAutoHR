"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import type { IconifyIcon } from "@iconify/react";
import home from "@iconify-icons/line-md/home";
import email from "@iconify-icons/line-md/email";
import plus from "@iconify-icons/line-md/plus";
import engine from "@iconify-icons/line-md/engine";
import clipboard from "@iconify-icons/line-md/clipboard-list";
import briefcase from "@iconify-icons/line-md/briefcase";
import documents from "@iconify-icons/line-md/document-list";
import steering from "@iconify-icons/line-md/steering";
import logoutIcon from "@iconify-icons/line-md/logout";
import foldLeft from "@iconify-icons/line-md/menu-fold-left";
import foldRight from "@iconify-icons/line-md/menu-fold-right";
import chevronUp from "@iconify-icons/line-md/chevron-up";
import chevronDown from "@iconify-icons/line-md/chevron-down";
import backup from "@iconify-icons/line-md/backup-restore";
import closeIcon from "@iconify-icons/line-md/close";
import { useGarage } from "@/components/garage-provider";
import { Gear, MotionIcon } from "@/components/motion-icon";
import { spaceLabel } from "@/lib/accounts";
import type { Role } from "@/lib/types";

const LINKS: Record<Role, { href: string; label: string; tab?: string; icon: IconifyIcon; match: (path: string) => boolean }[]> = {
  reception: [
    { href: "/", label: "Accueil", icon: home, match: (path) => path === "/" },
    { href: "/demandes", label: "Demandes", icon: email, match: (path) => path.startsWith("/demandes") },
    { href: "/nouveau", label: "Nouvel ordre", tab: "Ordre", icon: plus, match: (path) => path.startsWith("/nouveau") },
  ],
  atelier: [{ href: "/", label: "Atelier", icon: engine, match: (path) => path === "/" || path.startsWith("/dossier") }],
  comptabilite: [
    { href: "/", label: "Accueil", icon: home, match: (path) => path === "/" || path.startsWith("/dossier") },
    { href: "/grille", label: "Grille", icon: clipboard, match: (path) => path.startsWith("/grille") },
  ],
  achats: [{ href: "/", label: "À acheter", tab: "Achats", icon: briefcase, match: () => true }],
  direction: [{ href: "/", label: "Dossiers", icon: documents, match: (path) => path === "/" || path.startsWith("/dossier") }],
  client: [{ href: "/", label: "Mes voitures", tab: "Voitures", icon: steering, match: () => true }],
};

export function Shell({ children }: { children: ReactNode }) {
  const { state, profile, loading, busy, error, refresh } = useGarage();
  const [rail, setRail] = useState(false);
  const [barAway, setBarAway] = useState(false);

  useEffect(() => {
    setRail(window.localStorage.getItem("gahr-rail") === "1");
    setBarAway(window.localStorage.getItem("gahr-tab") === "1");
  }, []);

  function toggleRail() {
    setRail((value) => {
      window.localStorage.setItem("gahr-rail", value ? "0" : "1");
      return !value;
    });
  }

  function toggleBar() {
    setBarAway((value) => {
      window.localStorage.setItem("gahr-tab", value ? "0" : "1");
      return !value;
    });
  }

  if (loading && !state) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <p className="busy-inline"><Gear spinning /> Ouverture de l’espace…</p>
      </div>
    );
  }

  if (!state || !profile) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <div className="glass max-w-md p-8 text-center">
          <Image src="/logo.png" alt="Garage Auto HR" width={72} height={72} className="mx-auto" />
          <h1 className="mt-4 text-2xl font-bold">Espace inaccessible</h1>
          <p className="quiet mt-3">{error || "Reconnectez-vous pour ouvrir votre interface."}</p>
          <button className="btn mt-5" type="button" onClick={() => refresh().catch(() => undefined)}>
            <MotionIcon icon={backup} />
            <span>Réessayer</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("app-frame", rail && "is-rail")}>
      <Sidebar compact={rail} onToggle={toggleRail} />
      <div className="app-main">
        {profile.impersonating ? <ImpersonationBanner name={profile.name} role={profile.role} /> : null}
        {children}
      </div>
      <BottomNav away={barAway} onToggle={toggleBar} />
      {busy ? (
        <p className="busy-flag" role="status">
          <Gear spinning /> Action en cours
        </p>
      ) : null}
    </div>
  );
}

function Sidebar({ compact, onToggle }: { compact: boolean; onToggle: () => void }) {
  const path = usePathname();
  const { state, profile, role, logout } = useGarage();
  if (!state || !profile) return null;
  return (
    <aside className="sidebar no-print">
      <div className="side-top">
        <Link href="/" className="side-brand" aria-label="Accueil">
          <Image src="/logo.png" alt="" width={56} height={56} />
          <span className="side-copy">
            <strong>Garage Auto HR</strong>
            <small>{state.settings.city}</small>
          </span>
        </Link>
        <button className="side-fold" type="button" onClick={onToggle} aria-label={compact ? "Ouvrir le menu" : "Réduire le menu"}>
          <MotionIcon icon={compact ? foldRight : foldLeft} label={compact ? "Ouvrir" : "Réduire"} />
        </button>
      </div>
      <nav className="side-nav" aria-label="Espace">
        {LINKS[role].map((link) => (
          <Link key={link.href} href={link.href} className={cn("side-link", link.match(path) && "on")} title={link.label}>
            <MotionIcon icon={link.icon} label={link.label} />
            <span className="side-copy">{link.label}</span>
          </Link>
        ))}
      </nav>
      <div className="side-user">
        <strong className="side-copy">{profile.name}</strong>
        <small className="side-copy">{spaceLabel(role)}</small>
        <button className="btn-line" type="button" title="Sortir" onClick={() => logout().catch(() => undefined)}>
          <MotionIcon icon={logoutIcon} label="Sortir" />
          <span className="side-copy">Sortir</span>
        </button>
      </div>
    </aside>
  );
}

function BottomNav({ away, onToggle }: { away: boolean; onToggle: () => void }) {
  const path = usePathname();
  const { role, logout } = useGarage();
  if (away) {
    return (
      <nav className="tabbar is-away no-print" aria-label="Menu">
        <button className="tab-handle" type="button" onClick={onToggle} aria-label="Ouvrir le menu">
          <MotionIcon icon={chevronUp} />
          <span>Menu</span>
        </button>
      </nav>
    );
  }
  return (
    <nav className="tabbar no-print" aria-label="Menu">
      <div className="tab-links">
        {LINKS[role].map((link) => (
          <Link key={link.href + link.label} href={link.href} className={cn("tab-item", link.match(path) && "on")} aria-label={link.label}>
            <MotionIcon icon={link.icon} label={link.tab ?? link.label} />
            <span>{link.tab ?? link.label}</span>
          </Link>
        ))}
        <button className="tab-item" type="button" aria-label="Sortir" onClick={() => logout().catch(() => undefined)}>
          <MotionIcon icon={logoutIcon} label="Sortir" />
          <span>Sortir</span>
        </button>
      </div>
      <button className="tab-handle" type="button" onClick={onToggle} aria-label="Réduire le menu">
        <MotionIcon icon={chevronDown} />
      </button>
    </nav>
  );
}

function ImpersonationBanner({ name, role }: { name: string; role: Role | "superadmin" }) {
  const { stopImpersonation } = useGarage();
  return (
    <div className="impersonate no-print">
      <p>Interface de {name} · {spaceLabel(role)}</p>
      <button className="btn" type="button" onClick={() => stopImpersonation().catch(() => undefined)}>
        <MotionIcon icon={closeIcon} />
        <span>Quitter</span>
      </button>
    </div>
  );
}
