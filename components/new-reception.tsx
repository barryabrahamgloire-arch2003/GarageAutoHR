"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useGarage } from "@/components/garage-provider";
import { ReceptionEditor } from "@/components/forms";
import { Empty } from "@/components/kit";
import { emptyReception } from "@/lib/domain";

export function NewReception() {
  const router = useRouter();
  const { role, actorName, dispatch } = useGarage();
  if (role !== "reception" && role !== "atelier") {
    return <Empty title="Réception" text="L’ordre de réception se remplit à l’accueil ou par un garagiste." action={<button className="btn" type="button" onClick={() => router.push("/")}>Retour</button>} />;
  }

  return (
    <section className="glass rise mx-auto grid max-w-3xl gap-6 p-6 md:p-8">
      <header>
        <p className="kicker">Ordre de réception</p>
        <h1 className="display mt-2 text-[2.4rem]">Nouvelle arrivée</h1>
        <p className="quiet mt-3">La réceptionniste ou un garagiste remplit cette fiche. Le diagnostic d’atelier se complète ensuite.</p>
      </header>
      <ReceptionEditor
        initial={emptyReception(actorName)}
        includeDiagnostic={false}
        submitLabel="Ouvrir le dossier"
        onSubmit={async (order) => {
          try {
            const next = await dispatch({
              type: "openReception",
              payload: { ...order, actor: actorName || order.receptionist },
            });
            const created = next.dossiers.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
            if (created) router.push(`/dossier/${created.id}`);
          } catch (reason) {
            toast.error(reason instanceof Error ? reason.message : "Action impossible.");
          }
        }}
      />
    </section>
  );
}
