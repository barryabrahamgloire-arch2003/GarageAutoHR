"use client";

import { useMemo, useState } from "react";
import plus from "@iconify-icons/line-md/plus";
import checkAll from "@iconify-icons/line-md/check-all";
import { useGarage } from "@/components/garage-provider";
import { MotionIcon } from "@/components/motion-icon";
import { Empty } from "@/components/kit";
import { Popup } from "@/components/popup";
import { gnf, parseAmount } from "@/lib/format";
import type { Product } from "@/lib/types";

export function PriceGrid() {
  const { state, role, run, actorName } = useGarage();
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { price: string; stock: string }>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState<Product>({
    id: "",
    name: "",
    reference: "",
    category: "Pièces",
    price: 0,
    stock: 0,
    unit: "pièce",
  });
  const products = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!state) return [];
    return state.products.filter((product) =>
      !needle || `${product.name} ${product.reference} ${product.category}`.toLowerCase().includes(needle),
    );
  }, [query, state]);

  if (!state) return null;
  if (role !== "comptabilite" && role !== "direction") {
    return <Empty title="Grille" text="La grille des prix et le stock sont tenus par la comptabilité." />;
  }

  function draftOf(product: Product) {
    return drafts[product.id] ?? { price: String(product.price), stock: String(product.stock) };
  }

  return (
    <div className="grid gap-6">
      <header>
        <p className="kicker">Comptabilité</p>
        <h1 className="display mt-2">Grille et stock</h1>
        <p className="quiet mt-3 max-w-xl">Le prix de vente sert à la facture. Le prix d’achat, lui, est noté par les achats.</p>
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <input className="field max-w-md" value={query} placeholder="Chercher une pièce" onChange={(event) => setQuery(event.target.value)} />
        <button className="btn" type="button" onClick={() => setCreateOpen(true)}><MotionIcon icon={plus} /><span>Nouveau produit</span></button>
      </div>
      <div className="grid gap-3">
        {products.map((product) => {
          const draft = draftOf(product);
          return (
            <article key={product.id} className="glass grid items-end gap-3 p-4 md:grid-cols-[1.4fr_0.7fr_0.5fr_auto]">
              <div>
                <strong>{product.name}</strong>
                <p className="quiet text-sm">{product.category} · {product.reference} · {gnf(product.price)}</p>
              </div>
              <label className="grid gap-1">
                <span className="label">Prix de vente</span>
                <input className="field" inputMode="numeric" value={draft.price} onChange={(event) => setDrafts((current) => ({ ...current, [product.id]: { ...draft, price: event.target.value } }))} />
              </label>
              <label className="grid gap-1">
                <span className="label">Stock</span>
                <input className="field" inputMode="numeric" value={draft.stock} onChange={(event) => setDrafts((current) => ({ ...current, [product.id]: { ...draft, stock: event.target.value } }))} />
              </label>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  const price = parseAmount(draft.price);
                  const stock = parseAmount(draft.stock);
                  if (price === null || stock === null) return;
                  run({ type: "saveProduct", payload: { product: { ...product, price, stock }, actor: actorName } }, "Grille mise à jour");
                }}
              >
                <MotionIcon icon={checkAll} /><span>Enregistrer</span>
              </button>
            </article>
          );
        })}
      </div>
      <Popup open={createOpen} title="Nouveau produit" onClose={() => setCreateOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            run({ type: "saveProduct", payload: { product: creating, actor: actorName } }, "Produit ajouté").then((ok) => {
              if (!ok) return;
              setCreating({ id: "", name: "", reference: "", category: "Pièces", price: 0, stock: 0, unit: "pièce" });
              setCreateOpen(false);
            });
          }}
        >
          <input className="field" placeholder="Nom" value={creating.name} onChange={(event) => setCreating({ ...creating, name: event.target.value })} />
          <input className="field" placeholder="Référence" value={creating.reference} onChange={(event) => setCreating({ ...creating, reference: event.target.value })} />
          <input className="field" placeholder="Catégorie" value={creating.category} onChange={(event) => setCreating({ ...creating, category: event.target.value })} />
          <input className="field" placeholder="Prix" inputMode="numeric" value={creating.price || ""} onChange={(event) => setCreating({ ...creating, price: parseAmount(event.target.value) ?? 0 })} />
          <input className="field" placeholder="Stock" inputMode="numeric" value={creating.stock || ""} onChange={(event) => setCreating({ ...creating, stock: parseAmount(event.target.value) ?? 0 })} />
          <button className="btn" type="submit"><MotionIcon icon={plus} /><span>Ajouter à la grille</span></button>
        </form>
      </Popup>
    </div>
  );
}
