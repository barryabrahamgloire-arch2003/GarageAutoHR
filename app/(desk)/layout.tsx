"use client";

import type { ReactNode } from "react";
import { GarageProvider } from "@/components/garage-provider";
import { Shell } from "@/components/shell";

export default function DeskLayout({ children }: { children: ReactNode }) {
  return (
    <GarageProvider>
      <Shell>{children}</Shell>
    </GarageProvider>
  );
}
