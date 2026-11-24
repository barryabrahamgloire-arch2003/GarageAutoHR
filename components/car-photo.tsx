"use client";

import { useState } from "react";
import imageIcon from "@iconify-icons/line-md/image";
import upload from "@iconify-icons/line-md/upload";
import { MotionIcon } from "@/components/motion-icon";
import { compressPhoto } from "@/lib/photo";

export function CarPhoto({ value, onChange }: { value: string; onChange: (photo: string) => void }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function take(file: File | undefined) {
    if (!file) return;
    setPending(true);
    setError("");
    try {
      onChange(await compressPhoto(file));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La photo n’a pas pu être prise.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="photo-box">
      <div className="photo-frame">
        {value ? (
          // The photo is a compressed data URL produced in the browser.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Voiture photographiée à l’arrivée" />
        ) : (
          <span className="photo-empty">
            <MotionIcon icon={imageIcon} size={36} />
            <span>Photo de la voiture</span>
          </span>
        )}
      </div>
      <div className="photo-actions">
        <label className="btn">
          <MotionIcon icon={imageIcon} />
          <span>{pending ? "Préparation…" : value ? "Reprendre" : "Prendre la photo"}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={pending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              take(file).catch(() => undefined);
            }}
          />
        </label>
        <label className="btn-line">
          <MotionIcon icon={upload} />
          <span>Choisir une image</span>
          <input
            type="file"
            accept="image/*"
            disabled={pending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              take(file).catch(() => undefined);
            }}
          />
        </label>
      </div>
      {error ? <p className="text-sm text-[#8e322c]">{error}</p> : null}
    </div>
  );
}
