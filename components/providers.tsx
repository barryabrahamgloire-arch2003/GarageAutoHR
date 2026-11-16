"use client";

import { Suspense, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GarageProvider } from "@/components/garage-provider";
import { Shell } from "@/components/shell";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <GarageProvider>
        <Suspense fallback={<Opening />}>
          <Shell>{children}</Shell>
        </Suspense>
        <Toaster />
      </GarageProvider>
    </TooltipProvider>
  );
}

function Opening() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <p className="text-sm">Garage Auto HR</p>
        <p className="mt-2 text-sm text-muted-foreground">Ouverture des dossiers…</p>
      </div>
    </div>
  );
}
