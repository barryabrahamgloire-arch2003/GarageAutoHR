"use client";

import { useState } from "react";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, spaceLabel } from "@/lib/accounts";
import { Liquid } from "@/components/liquid";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="auth-grid">
      <Liquid />
      <aside className="auth-aside stage">
        <p className="kicker">Auto HR</p>
        <h1 className="display mt-4">Chaque métier a son interface.</h1>
        <p className="quiet mt-5 max-w-md text-lg">
          Réception, atelier, comptabilité, achats, direction et client entrent dans leur espace. Le superadmin ouvre l’interface de n’importe quel membre.
        </p>
      </aside>
      <main className="stage grid place-items-center px-4 py-10">
        <form
          className="glass rise w-full max-w-md p-7"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError("");
            const response = await fetch("/api/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password }),
            });
            const body = (await response.json().catch(() => null)) as { error?: string; role?: string } | null;
            if (!response.ok) {
              setError(body?.error || "Connexion impossible.");
              setPending(false);
              return;
            }
            window.location.href = body?.role === "superadmin" ? "/admin" : "/";
          }}
        >
          <p className="kicker">Connexion</p>
          <h2 className="mt-2 text-2xl">Entrer dans l’espace</h2>
          <label className="mt-6 grid gap-1">
            <span className="label">E-mail</span>
            <input className="field" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="mt-3 grid gap-1">
            <span className="label">Mot de passe</span>
            <input className="field" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error ? <p className="mt-3 text-sm text-[#8d3a32]">{error}</p> : null}
          <button className="btn mt-5 w-full" type="submit" disabled={pending}>
            {pending ? "Ouverture…" : "Continuer"}
          </button>
          <div className="mt-6">
            <p className="hint">Comptes livrés · mot de passe {DEMO_PASSWORD}</p>
            <div className="mt-2 grid gap-1">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.id}
                  className="btn-ghost justify-between"
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(DEMO_PASSWORD);
                  }}
                >
                  <span>{account.name}</span>
                  <small className="quiet">{spaceLabel(account.role)}</small>
                </button>
              ))}
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
