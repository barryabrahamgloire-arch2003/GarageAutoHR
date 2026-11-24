"use client";

import { useState } from "react";
import checkAll from "@iconify-icons/line-md/check-all";
import closeIcon from "@iconify-icons/line-md/close";
import plus from "@iconify-icons/line-md/plus";
import { AreaField, Choice, SignaturePad, TextField } from "@/components/kit";
import { Gear, MotionIcon } from "@/components/motion-icon";
import { blankTask } from "@/lib/domain";
import { SECTIONS } from "@/lib/format";
import type { ActivityReport, ReceptionOrder, WorkshopSheet } from "@/lib/types";

export function ReceptionEditor({
  initial,
  includeDiagnostic,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initial: ReceptionOrder;
  includeDiagnostic: boolean;
  submitLabel: string;
  onCancel?: () => void;
  onSubmit: (order: ReceptionOrder) => Promise<void>;
}) {
  const [draft, setDraft] = useState(initial);
  const [pending, setPending] = useState(false);
  const set = <K extends keyof ReceptionOrder>(key: K, value: ReceptionOrder[K]) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        onSubmit(draft).finally(() => setPending(false));
      }}
    >
      <section className="grid gap-4 md:grid-cols-2">
        <TextField label="Date d’ouverture" type="date" value={draft.openedAt} onChange={(value) => set("openedAt", value)} />
        <TextField label="Numéro d’immatriculation" value={draft.plate} onChange={(value) => set("plate", value)} />
        <TextField label="Réceptionniste" value={draft.receptionist} onChange={(value) => set("receptionist", value)} />
        <TextField label="Particulier" value={draft.particulier} onChange={(value) => set("particulier", value)} />
        <TextField label="Moteur" value={draft.engine} onChange={(value) => set("engine", value)} />
        <TextField label="Téléphone" value={draft.phone} onChange={(value) => set("phone", value)} />
        <TextField label="Entreprise" value={draft.company} onChange={(value) => set("company", value)} />
        <TextField label="Chauffeur" value={draft.driver} onChange={(value) => set("driver", value)} />
        <div className="md:col-span-2">
          <TextField label="Marque / modèle" value={draft.makeModel} onChange={(value) => set("makeModel", value)} />
        </div>
        <div className="md:col-span-2">
          <AreaField label="Déclaration de pannes à l’arrivée (client)" value={draft.arrivalFaults} onChange={(value) => set("arrivalFaults", value)} />
        </div>
      </section>
      {includeDiagnostic ? (
        <section className="grid gap-4 border-t border-white/70 pt-5 md:grid-cols-2">
          <p className="kicker md:col-span-2">Résultats à l’atelier</p>
          <div className="md:col-span-2">
            <AreaField label="Résultats des diagnostics à l’atelier" value={draft.diagnosticResult} onChange={(value) => set("diagnosticResult", value)} />
          </div>
          <TextField label="Date" type="date" value={draft.diagnosticDate} onChange={(value) => set("diagnosticDate", value)} />
          <Choice label="Section" value={draft.section} options={SECTIONS} onChange={(value) => set("section", value)} />
          <TextField label="Prénom et nom de l’intervenant" value={draft.intervenant} onChange={(value) => set("intervenant", value)} />
          <TextField label="Date de fin des travaux" type="date" value={draft.workEndDate} onChange={(value) => set("workEndDate", value)} />
          <div className="md:col-span-2">
            <AreaField label="Observation" value={draft.observation} onChange={(value) => set("observation", value)} />
          </div>
          <TextField label="Nom du responsable" value={draft.managerName} onChange={(value) => set("managerName", value)} />
          <SignaturePad value={draft.managerSignature} onChange={(value) => set("managerSignature", value)} />
          <TextField label="Nom du client" value={draft.clientSigner} onChange={(value) => set("clientSigner", value)} />
          <SignaturePad value={draft.clientSignature} onChange={(value) => set("clientSignature", value)} />
        </section>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <SaveButton pending={pending} label={submitLabel} />
        {onCancel ? <CancelButton onClick={onCancel} /> : null}
      </div>
    </form>
  );
}

export function WorkshopEditor({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: WorkshopSheet;
  onCancel: () => void;
  onSubmit: (sheet: WorkshopSheet) => Promise<void>;
}) {
  const [draft, setDraft] = useState(initial);
  const [pending, setPending] = useState(false);
  const set = <K extends keyof WorkshopSheet>(key: K, value: WorkshopSheet[K]) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        onSubmit(draft).finally(() => setPending(false));
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Date de début" type="date" value={draft.startDate} onChange={(value) => set("startDate", value)} />
        <TextField label="Date de fin" type="date" value={draft.endDate} onChange={(value) => set("endDate", value)} />
        <TextField label="Heure de début" type="time" value={draft.startTime} onChange={(value) => set("startTime", value)} />
        <TextField label="Heure de fin" type="time" value={draft.endTime} onChange={(value) => set("endTime", value)} />
        <TextField label="Marque / modèle" value={draft.makeModel} onChange={(value) => set("makeModel", value)} />
        <Choice label="Section" value={draft.section} options={SECTIONS} onChange={(value) => set("section", value)} />
        <TextField label="Numéro d’immatriculation" value={draft.plate} onChange={(value) => set("plate", value)} />
        <TextField label="Compteur fin" value={draft.odometerEnd} onChange={(value) => set("odometerEnd", value)} />
      </div>
      <div className="grid gap-3">
        {draft.tasks.map((task, index) => (
          <div key={task.id} className="grid gap-3 rounded-2xl bg-white/40 p-3 md:grid-cols-2">
            <TextField
              label="Date"
              type="date"
              value={task.date}
              onChange={(value) =>
                set(
                  "tasks",
                  draft.tasks.map((item, itemIndex) => (itemIndex === index ? { ...item, date: value } : item)),
                )
              }
            />
            <TextField
              label="Référence"
              value={task.reference}
              onChange={(value) =>
                set(
                  "tasks",
                  draft.tasks.map((item, itemIndex) => (itemIndex === index ? { ...item, reference: value } : item)),
                )
              }
            />
            <div className="md:col-span-2">
              <AreaField
                label="Travaux à effectuer"
                value={task.work}
                onChange={(value) =>
                  set(
                    "tasks",
                    draft.tasks.map((item, itemIndex) => (itemIndex === index ? { ...item, work: value } : item)),
                  )
                }
              />
            </div>
            <div className="md:col-span-2">
              <AreaField
                label="Observation"
                value={task.observation}
                onChange={(value) =>
                  set(
                    "tasks",
                    draft.tasks.map((item, itemIndex) => (itemIndex === index ? { ...item, observation: value } : item)),
                  )
                }
              />
            </div>
          </div>
        ))}
        <button className="btn-line" type="button" onClick={() => set("tasks", [...draft.tasks, blankTask()])}>
          <MotionIcon icon={plus} />
          <span>Ajouter un travail</span>
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Nom de l’intervenant" value={draft.intervenant} onChange={(value) => set("intervenant", value)} />
        <SignaturePad value={draft.intervenantSignature} onChange={(value) => set("intervenantSignature", value)} />
        <TextField label="Nom du chef d’atelier" value={draft.chef} onChange={(value) => set("chef", value)} />
        <SignaturePad value={draft.chefSignature} onChange={(value) => set("chefSignature", value)} />
      </div>
      <div className="flex gap-2">
        <SaveButton pending={pending} label="Enregistrer la fiche" />
        <CancelButton onClick={onCancel} />
      </div>
    </form>
  );
}

function SaveButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? <Gear spinning /> : <MotionIcon icon={checkAll} />}
      <span>{pending ? "Enregistrement…" : label}</span>
    </button>
  );
}

function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="btn-line" type="button" onClick={onClick}>
      <MotionIcon icon={closeIcon} />
      <span>Annuler</span>
    </button>
  );
}

export function ReportEditor({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: ActivityReport;
  onCancel: () => void;
  onSubmit: (report: ActivityReport) => Promise<void>;
}) {
  const [draft, setDraft] = useState(initial);
  const [pending, setPending] = useState(false);
  const set = <K extends keyof ActivityReport>(key: K, value: ActivityReport[K]) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        onSubmit(draft).finally(() => setPending(false));
      }}
    >
      <TextField label="Numéro d’immatriculation" value={draft.plate} onChange={(value) => set("plate", value)} />
      <TextField label="Marque / modèle" value={draft.makeModel} onChange={(value) => set("makeModel", value)} />
      <TextField label="Kms" value={draft.kms} onChange={(value) => set("kms", value)} />
      <TextField label="Client" value={draft.clientName} onChange={(value) => set("clientName", value)} />
      <TextField label="Date d’entrée" type="date" value={draft.entryDate} onChange={(value) => set("entryDate", value)} />
      <TextField label="Date de sortie" type="date" value={draft.exitDate} onChange={(value) => set("exitDate", value)} />
      <TextField label="Téléphone client" value={draft.phone} onChange={(value) => set("phone", value)} />
      <TextField label="Nom du chauffeur" value={draft.driver} onChange={(value) => set("driver", value)} />
      <div className="md:col-span-2">
        <AreaField label="Description des pannes" value={draft.faults} onChange={(value) => set("faults", value)} />
      </div>
      <div className="md:col-span-2">
        <AreaField label="Travaux effectués et pièces changées" value={draft.workAndParts} onChange={(value) => set("workAndParts", value)} />
      </div>
      <div className="md:col-span-2">
        <AreaField label="Observation" value={draft.observation} onChange={(value) => set("observation", value)} />
      </div>
      <TextField label="Chef d’atelier" value={draft.chef} onChange={(value) => set("chef", value)} />
      <TextField label="Directeur technique" value={draft.director} onChange={(value) => set("director", value)} />
      <TextField label="Date" type="date" value={draft.date} onChange={(value) => set("date", value)} />
      <TextField label="Heure" type="time" value={draft.time} onChange={(value) => set("time", value)} />
      <SignaturePad value={draft.chefSignature} onChange={(value) => set("chefSignature", value)} />
      <div className="grid gap-3">
        <TextField label="Nom du client qui signe" value={draft.clientSigner} onChange={(value) => set("clientSigner", value)} />
        <SignaturePad value={draft.clientSignature} onChange={(value) => set("clientSignature", value)} />
      </div>
      <div className="md:col-span-2">
        <SignaturePad value={draft.directorSignature} onChange={(value) => set("directorSignature", value)} />
      </div>
      <div className="flex gap-2 md:col-span-2">
        <SaveButton pending={pending} label="Enregistrer le rapport" />
        <CancelButton onClick={onCancel} />
      </div>
    </form>
  );
}
