"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import arrowLeft from "@iconify-icons/line-md/arrow-left";
import { useGarage } from "@/components/garage-provider";
import { MotionIcon } from "@/components/motion-icon";
import { CarPhoto } from "@/components/car-photo";
import { ReceptionEditor } from "@/components/forms";
import { Empty } from "@/components/kit";
import { emptyReception } from "@/lib/domain";

export function NewReception() {
  const router = useRouter();
  const { role, actorName, dispatch } = useGarage();
  const [photo, setPhoto] = useState("");
  if (role !== "reception" && role !== "atelier") {
    return <Empty title="Réception" text="L’ordre de réception se remplit à l’accueil ou par un garagiste." action={<button className="btn" type="button" onClick={() => router.push("/")}><MotionIcon icon={arrowLeft} /><span>Retour</span></button>} />;
  }

  return (
    <section className="work">
      <header className="page-head">
        <p className="kicker">Ordre de réception</p>
        <h1 className="page-title">Nouvelle arrivée</h1>
        <p className="quiet">La réceptionniste ou un garagiste remplit cette fiche. Le diagnostic d’atelier se complète ensuite.</p>
      </header>
      <div className="glass sheet grid gap-4">
        <CarPhoto value={photo} onChange={setPhoto} />
        <ReceptionEditor
          initial={emptyReception(actorName)}
          includeDiagnostic={false}
          submitLabel="Ouvrir le dossier"
          onCancel={() => router.push("/")}
          onSubmit={async (order) => {
            try {
              const next = await dispatch({
                type: "openReception",
                payload: { ...order, photo, actor: actorName || order.receptionist },
              });
              const created = next.dossiers.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
              if (created) router.push(`/dossier/${created.id}`);
            } catch (reason) {
              toast.error(reason instanceof Error ? reason.message : "Action impossible.");
            }
          }}
        />
      </div>
    </section>
  );
}
