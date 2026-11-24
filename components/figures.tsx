"use client";

import NumberFlow, { NumberFlowGroup } from "@number-flow/react";

const move = { duration: 280, easing: "cubic-bezier(0.23, 1, 0.32, 1)" };
const fade = { duration: 180, easing: "ease-out" };

export function Count({ value }: { value: number }) {
  return (
    <NumberFlow
      value={value}
      locales="fr-FR"
      format={{ maximumFractionDigits: 0 }}
      transformTiming={move}
      opacityTiming={fade}
    />
  );
}

export function Money({ value }: { value: number }) {
  return (
    <NumberFlow
      value={value}
      locales="fr-FR"
      format={{ maximumFractionDigits: 0 }}
      suffix=" GNF"
      transformTiming={move}
      opacityTiming={fade}
    />
  );
}

export { NumberFlowGroup };
