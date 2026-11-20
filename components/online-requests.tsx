"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useGarage } from "@/components/garage-provider";
import { whatsappHref } from "@/lib/format";
import type { OnlineRequest } from "@/lib/online-requests";

export function OnlineRequests() {
  const { role } = useGarage();
  const [rows, setRows] = useState<OnlineRequest[] | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/demandes", { cache: "no-store" });
    const body = (await response.json()) as { demandes?: OnlineRequest[]; error?: string };
    if (!response.ok) throw new Error(body.error || "Lecture impossible.");
    setRows(body.demandes ?? []);
  }

  useEffect(() => {
    if (role !== "reception") return;
    load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Lecture impossible."));
  }, [role]);

  if (role !== "reception") {
    return <p className="quiet">Les demandes en ligne sont réservées à la réception.</p>;
  }

  const list = rows ?? [];
  const fresh = list.filter((item) => !item.seenAt).length;

  return (
    <div className="rise grid gap-8">
      <div className="grid gap-4">
        <header className="home-hero">
          <Image src="/logo.png" alt="Garage Auto HR" width={88} height={88} className="home-logo" />
          <div>
            <p className="kicker">Réception</p>
            <h1 className="mt-1">Demandes en ligne</h1>
            <p className="quiet mt-2 max-w-xl">Les formulaires du site arrivent ici, et un mail part vers contact@garageautohrco.com.</p>
          </div>
        </header>
        <div className="stat-grid">
          <article className="stat"><strong>{fresh}</strong><span>Nouvelles</span></article>
          <article className="stat"><strong>{list.length}</strong><span>Au total</span></article>
          <article className="stat"><strong>{list.filter((item) => item.kind === "client").length}</strong><span>Clients</span></article>
        </div>
      </div>
      {error ? <p className="quiet">{error}</p> : null}
      {!rows ? <p className="quiet">Chargement des demandes…</p> : null}
      {rows && !list.length ? <p className="quiet">Aucune demande pour le moment.</p> : null}
      <div className="grid gap-3">
        {list.map((item) => (
          <article key={item.id} className="glass grid gap-2 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="kicker">{item.kind === "client" ? "Client" : "Fournisseur"} · {new Date(item.createdAt).toLocaleString("fr-FR")}</p>
              {item.seenAt ? <span className="badge">Lue</span> : <span className="badge wait">Nouvelle</span>}
            </div>
            <h2 className="text-xl font-bold">{item.name}</h2>
            <p>{item.subject}</p>
            <p className="quiet">{item.message}</p>
            {item.vehicle ? <p>Véhicule : {item.vehicle}</p> : null}
            {item.category ? <p>Catégorie : {item.category}</p> : null}
            <p>{item.phone}{item.email ? ` · ${item.email}` : ""}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a className="btn" href={`tel:${item.phone.replace(/\s/g, "")}`}>Appeler</a>
              <a className="btn-line" href={whatsappHref(item.phone, `Bonjour ${item.name}, Garage Auto HR Conakry. Nous avons bien reçu votre demande : ${item.subject}.`)} target="_blank" rel="noreferrer">WhatsApp</a>
              {item.seenAt ? null : (
                <button
                  className="btn-line"
                  type="button"
                  onClick={() => {
                    fetch("/api/demandes", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: item.id }),
                    })
                      .then(() => load())
                      .catch(() => setError("La demande n’a pas pu être marquée comme lue."));
                  }}
                >
                  Marquer comme lue
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
