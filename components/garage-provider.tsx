"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Action, Role, State } from "@/lib/types";

interface Profile {
  accountId: string;
  name: string;
  email: string;
  role: Role | "superadmin";
  garageId: string | null;
  garageName: string;
  staffId: string | null;
  clientId: string | null;
  impersonating: boolean;
  impersonatorName: string | null;
}

interface GarageContextValue {
  state: State | null;
  profile: Profile | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
  role: Role;
  clientId: string;
  actorId: string;
  actorName: string;
  garageName: string;
  refresh: () => Promise<void>;
  dispatch: (action: Action) => Promise<State>;
  run: (action: Action, success?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const GarageContext = createContext<GarageContextValue | null>(null);

export function useGarage() {
  const value = useContext(GarageContext);
  if (!value) throw new Error("Le contexte du garage est introuvable.");
  return value;
}

export function GarageProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const track = useCallback(async <T,>(job: Promise<T>) => {
    setPending((count) => count + 1);
    try {
      return await job;
    } finally {
      setPending((count) => Math.max(0, count - 1));
    }
  }, []);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/connexion");
      return;
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error || "Les dossiers n'ont pas pu être lus.");
    }
    setState((await response.json()) as State);
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/session", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/connexion");
          return null;
        }
        if (!response.ok) throw new Error("Session illisible.");
        return (await response.json()) as Profile;
      })
      .then(async (next) => {
        if (cancelled || !next) return;
        if (next.role === "superadmin" && !next.impersonating) {
          router.replace("/admin");
          return;
        }
        setProfile(next);
        await refresh();
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Lecture impossible.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const timer = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 12000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refresh, router]);

  const dispatch = useCallback(
    async (action: Action) => track((async () => {
      const response = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const data = (await response.json()) as State | { error?: string };
      if (!response.ok || !("settings" in data)) {
        throw new Error("error" in data && data.error ? data.error : "Action impossible.");
      }
      setState(data);
      return data;
    })()),
    [track],
  );

  const run = useCallback(
    async (action: Action, success?: string) => {
      const id = toast.loading("Action en cours");
      try {
        await dispatch(action);
        if (success) toast.success(success, { id });
        else toast.dismiss(id);
        return true;
      } catch (reason) {
        toast.error(reason instanceof Error ? reason.message : "Action impossible.", { id });
        return false;
      }
    },
    [dispatch],
  );

  const logout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/connexion");
    router.refresh();
  }, [router]);

  const stopImpersonation = useCallback(async () => {
    await fetch("/api/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stop: true }),
    });
    router.push("/admin");
    router.refresh();
  }, [router]);

  const role = profile && profile.role !== "superadmin" ? profile.role : "reception";

  return (
    <GarageContext.Provider
      value={{
        state,
        profile,
        loading,
        busy: pending > 0,
        error,
        role,
        clientId: profile?.clientId ?? "",
        actorId: profile?.staffId ?? "",
        actorName: profile?.name ?? "",
        garageName: profile?.garageName ?? "Auto HR",
        refresh,
        dispatch,
        run,
        logout,
        stopImpersonation,
      }}
    >
      {children}
    </GarageContext.Provider>
  );
}
