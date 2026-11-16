"use client";

import { useParams } from "next/navigation";
import { DossierScreen } from "@/components/dossier-screen";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <DossierScreen id={params.id} />;
}
