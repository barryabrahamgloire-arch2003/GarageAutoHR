"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { IconifyIcon } from "@iconify/react";
import chat from "@iconify-icons/line-md/chat";
import trash from "@iconify-icons/line-md/trash";
import chevronDown from "@iconify-icons/line-md/chevron-down";
import chevronUp from "@iconify-icons/line-md/chevron-up";
import steering from "@iconify-icons/line-md/steering";
import gauge from "@iconify-icons/line-md/gauge";
import fileDocument from "@iconify-icons/line-md/file-document";
import confirm from "@iconify-icons/line-md/confirm";
import checkAll from "@iconify-icons/line-md/check-all";
import watch from "@iconify-icons/line-md/watch";
import { Gear, MotionIcon } from "@/components/motion-icon";
import { STATUSES, type Status } from "@/lib/types";
import { STATUS_LABEL, whatsappHref } from "@/lib/format";
import type { Talk } from "@/lib/talk";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <input className="field" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

export function AreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <textarea className="area" value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

export function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const list = options.includes(value) || !value ? options : [value, ...options];
  return (
    <Field label={label}>
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Choisir</option>
        {list.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function SignaturePad({ value, onChange }: { value: string; onChange: (image: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const initial = useRef(value);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = Math.max(rect.width, 280) * ratio;
    canvas.height = 140 * ratio;
    context.scale(ratio, ratio);
    context.lineWidth = 1.8;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#1c1f24";
    if (!initial.current) return;
    const image = new Image();
    image.onload = () => context.drawImage(image, 0, 0, rect.width || 280, 140);
    image.src = initial.current;
  }, []);

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: ReactPointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    last.current = point(event);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const next = point(event);
    context.beginPath();
    context.moveTo(last.current.x, last.current.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    last.current = next;
  }

  function end(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = ref.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function clear() {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <span className="label">Signature</span>
        <button type="button" className="btn-ghost" onClick={clear}>
          <MotionIcon icon={trash} />
          <span>Effacer</span>
        </button>
      </div>
      <canvas ref={ref} className="sign" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} />
      <span className="hint">Signez avec le doigt ou la souris.</span>
    </div>
  );
}

export function SignatureView({ image, name }: { image?: string; name?: string }) {
  if (!image && !name) return null;
  return (
    <div className="grid gap-1">
      {name ? <strong>{name}</strong> : null}
      {image ? (
        <div
          role="img"
          aria-label={`Signature de ${name || "la personne"}`}
          className="h-24 w-full rounded-2xl bg-white/70 bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url("${image}")` }}
        />
      ) : null}
    </div>
  );
}

export function Section({
  title,
  extra,
  children,
  startOpen = false,
  className,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
  startOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(startOpen);
  return (
    <section className={className ? `glass panel ${className}` : "glass panel"}>
      <div className="panel-bar">
        <button className="panel-toggle" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <MotionIcon icon={open ? chevronUp : chevronDown} />
          <span>{title}</span>
        </button>
        {extra}
      </div>
      <div className={open ? "fold open" : "fold"}>
        <div>
          <div className="panel-body">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function WhatsAppList({ talks }: { talks: Talk[] }) {
  const [phase, setPhase] = useState<"idle" | "spin" | "open">("idle");
  if (!talks.length) return null;
  function toggle() {
    if (phase === "open") {
      setPhase("idle");
      return;
    }
    setPhase("spin");
    window.setTimeout(() => setPhase("open"), 680);
  }
  return (
    <section className="no-print">
      <button className="icon-btn" type="button" onClick={toggle} aria-expanded={phase === "open"} aria-label="Contacts WhatsApp">
        <Gear spinning={phase === "spin"} />
      </button>
      {phase === "open" ? (
        <div className="chips pop-in">
          {talks.map((talk) => (
            <WhatsApp key={`${talk.role}-${talk.name}`} talk={talk} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function WhatsApp({ talk }: { talk: Talk }) {
  return (
    <a className="chip" href={whatsappHref(talk.phone, talk.text)} target="_blank" rel="noreferrer">
      <small className="inline-flex items-center gap-1">
        <MotionIcon icon={chat} /> {talk.role}
      </small>
      <strong>{talk.name}</strong>
    </a>
  );
}

export const STATUS_ICON: Record<Status, IconifyIcon> = {
  recu: steering,
  diagnostic: gauge,
  facture_prete: fileDocument,
  paiement_effectue: confirm,
  reparation_faite: checkAll,
};

export function StatusMark({ status, label, size = 16 }: { status: Status | null; label: string; size?: number }) {
  return (
    <span className={status ? `status-pill status-${status}` : "status-pill status-wait"}>
      <MotionIcon icon={status ? STATUS_ICON[status] : watch} size={size} />
      <span>{label}</span>
    </span>
  );
}

export function StatusRail({ status }: { status: Status }) {
  const index = STATUSES.indexOf(status);
  return (
    <ol className="rail">
      {STATUSES.map((step, stepIndex) => (
        <li key={step} className={stepIndex < index ? "done" : stepIndex === index ? "now" : ""}>
          <span><MotionIcon icon={STATUS_ICON[step]} size={16} /></span>
          {STATUS_LABEL[step]}
        </li>
      ))}
    </ol>
  );
}

export function PaperRow({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null;
  return (
    <div className="row">
      <span>{label}</span>
      <strong className="whitespace-pre-wrap">{value}</strong>
    </div>
  );
}

export function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <section className="glass rise mx-auto max-w-xl p-8 text-center">
      <h1 className="display text-[2.2rem]">{title}</h1>
      <p className="quiet mt-3">{text}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
