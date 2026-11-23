"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function Popup({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="popup-card max-h-[min(88dvh,920px)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
