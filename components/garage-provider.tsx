"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { clientLabel } from "@/lib/format";
import { ROLES, type Action, type Role, type State } from "@/lib/types";

const ROLE_KEY = "gahr-role";
const CLIENT_KEY = "gahr-client";
const ACTOR_KEY = "gahr-actor";

interface Prefs {
  role: Role;
  clientId: string;
  actorId: string;
}

interface GarageContextValue {
  state: State | null;
  loading: boolean;
  error: string | null;
  role: Role;
  setRole: (role: Role) => void;
  clientId: string;
  setClientId: (id: string) => void;
  actorId: string;
  setActor: (id: string) => void;
  actorName: string;
  refresh: () => Promise<void>;
  dispatch: (action: Action) => Promise<State>;
  run: (action: Action, success?: string) => Promise<boolean>;
  reset: () => Promise<void>;
}

const GarageContext = createContext<GarageContextValue | null>(null);

export function useGarage() {
  const value = useContext(GarageContext);
  if (!value) throw new Error("Le contexte du garage est introuvable.");
  return value;
}

const serverPrefs: Prefs = {
  role: "reception",
  clientId: "c_transkipe",
  actorId: "s_aissatou",
};

let prefs = serverPrefs;
let hydrated = false;
const prefListeners = new Set<() => void>();

function hydratePrefs() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const storedRole = localStorage.getItem(ROLE_KEY);
  prefs = {
    role: storedRole && ROLES.includes(storedRole as Role) ? (storedRole as Role) : "reception",
    clientId: localStorage.getItem(CLIENT_KEY) || "c_transkipe",
    actorId: localStorage.getItem(ACTOR_KEY) || "s_aissatou",
  };
}

function subscribePrefs(listener: () => void) {
  hydratePrefs();
  prefListeners.add(listener);
  return () => prefListeners.delete(listener);
}

function getPrefs() {
  hydratePrefs();
  return prefs;
}

function writePrefs(next: Prefs) {
  prefs = next;
  localStorage.setItem(ROLE_KEY, next.role);
  localStorage.setItem(CLIENT_KEY, next.clientId);
  localStorage.setItem(ACTOR_KEY, next.actorId);
  prefListeners.forEach((listener) => listener());
}

function reconcile(data: State, current: Prefs): Prefs {
  const clientId = data.clients.some((client) => client.id === current.clientId)
    ? current.clientId
    : (data.clients.find((client) => client.id === "c_transkipe")?.id ?? data.clients[0]?.id ?? "");
  const actor = data.staff.find((person) => person.id === current.actorId);
  const actorOk = current.role === "client" || actor?.role === current.role;
  const actorId = actorOk
    ? current.actorId
    : (data.staff.find((person) => person.role === current.role)?.id ?? data.staff[0]?.id ?? "");
  return { ...current, clientId, actorId };
}

export function GarageProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stored = useSyncExternalStore(subscribePrefs, getPrefs, () => serverPrefs);

  const applyState = useCallback((data: State) => {
    setState(data);
    const next = reconcile(data, getPrefs());
    const current = getPrefs();
    if (next.clientId !== current.clientId || next.actorId !== current.actorId) writePrefs(next);
  }, []);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) throw new Error("Les dossiers n'ont pas pu être lus.");
    applyState((await response.json()) as State);
  }, [applyState]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/state", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Les dossiers n'ont pas pu être lus.");
        return (await response.json()) as State;
      })
      .then((data) => {
        if (!cancelled) applyState(data);
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
  }, [applyState, refresh]);

  const setRole = useCallback(
    (next: Role) => {
      const current = getPrefs();
      const actorId =
        next === "client"
          ? current.actorId
          : (state?.staff.find((person) => person.id === current.actorId && person.role === next)?.id ??
            state?.staff.find((person) => person.role === next)?.id ??
            current.actorId);
      writePrefs({ ...current, role: next, actorId });
      router.push("/");
    },
    [router, state],
  );

  const setClientId = useCallback((id: string) => {
    writePrefs({ ...getPrefs(), clientId: id });
  }, []);

  const setActor = useCallback((id: string) => {
    writePrefs({ ...getPrefs(), actorId: id });
  }, []);

  const dispatch = useCallback(
    async (action: Action) => {
      const response = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const data = (await response.json()) as State | { error?: string };
      if (!response.ok || !("settings" in data)) {
        throw new Error("error" in data && data.error ? data.error : "Action impossible.");
      }
      applyState(data);
      return data;
    },
    [applyState],
  );

  const run = useCallback(
    async (action: Action, success?: string) => {
      try {
        await dispatch(action);
        if (success) toast.success(success);
        return true;
      } catch (reason) {
        toast.error(reason instanceof Error ? reason.message : "Action impossible.");
        return false;
      }
    },
    [dispatch],
  );

  const reset = useCallback(async () => {
    const response = await fetch("/api/reset", { method: "POST" });
    if (!response.ok) {
      toast.error("La restauration a échoué.");
      return;
    }
    applyState((await response.json()) as State);
    toast.success("Dossiers d’exemple restaurés.");
  }, [applyState]);

  const actor = state?.staff.find((person) => person.id === stored.actorId);
  const client = state?.clients.find((item) => item.id === stored.clientId);
  const actorName = stored.role === "client" ? (client ? clientLabel(client) : "Client") : (actor?.name ?? "");

  return (
    <GarageContext.Provider
      value={{
        state,
        loading,
        error,
        role: stored.role,
        setRole,
        clientId: stored.clientId,
        setClientId,
        actorId: stored.actorId,
        setActor,
        actorName,
        refresh,
        dispatch,
        run,
        reset,
      }}
    >
      {children}
    </GarageContext.Provider>
  );
}
