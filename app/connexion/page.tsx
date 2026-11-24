"use client";

import { useState } from "react";
import Image from "next/image";
import login from "@iconify-icons/line-md/login";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, spaceLabel } from "@/lib/accounts";
import { Gear, MotionIcon } from "@/components/motion-icon";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="auth-grid">
      <section className="auth-brand">
        <Image src="/logo.png" alt="Logo du Garage Auto HR" width={128} height={128} className="logo-tile" priority />
        <div>
          <p className="kicker !text-[#e7b2ad]">Kipé, Conakry</p>
          <h1 className="mt-2">Garage Auto HR</h1>
        </div>
        <p className="max-w-sm text-lg text-[#ddd4ca]">Chaque métier entre dans son espace. Le client ne voit que le statut publié par la comptabilité.</p>
        <ol className="auth-steps">
          <li><b>1</b><span>La réception ouvre le dossier de la voiture.</span></li>
          <li><b>2</b><span>L’atelier diagnostique. La comptabilité prépare la facture et publie le statut.</span></li>
          <li><b>3</b><span>La direction valide les achats. La réparation attend 70 % du règlement.</span></li>
        </ol>
      </section>
      <main className="auth-panel">
        <form
          className="auth-card"
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
          <h2 className="text-2xl font-bold tracking-tight">Connexion</h2>
          <p className="quiet mt-1">Choisissez un compte, ou saisissez l’e-mail.</p>
          <label className="mt-5 grid gap-1">
            <span className="label">E-mail</span>
            <input className="field" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="mt-3 grid gap-1">
            <span className="label">Mot de passe</span>
            <input className="field" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error ? <p className="mt-3 text-sm text-[#8e322c]">{error}</p> : null}
          <button className="btn mt-5 w-full" type="submit" disabled={pending}>
            {pending ? <Gear spinning /> : <MotionIcon icon={login} />}
            <span>{pending ? "Ouverture…" : "Entrer"}</span>
          </button>
          <p className="hint mt-6">Comptes livrés · mot de passe {DEMO_PASSWORD}</p>
          <div className="account-grid mt-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(DEMO_PASSWORD);
                }}
              >
                <span className="font-semibold">{account.name}</span>
                <small>{spaceLabel(account.role)}</small>
              </button>
            ))}
          </div>
        </form>
      </main>
    </div>
  );
}
