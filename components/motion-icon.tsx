"use client";

import { useState } from "react";
import { Icon, type IconifyIcon } from "@iconify/react";

export function MotionIcon({ icon, label, size = 22 }: { icon: IconifyIcon; label?: string; size?: number }) {
  const [play, setPlay] = useState(0);
  return (
    <span
      className="motion-icon"
      title={label}
      style={{ width: size, height: size }}
      onMouseEnter={() => setPlay((value) => value + 1)}
      onFocus={() => setPlay((value) => value + 1)}
    >
      <Icon key={play} icon={icon} width={size} height={size} />
    </span>
  );
}

export function Gear({ spinning = false, label }: { spinning?: boolean; label?: string }) {
  return (
    <svg className={spinning ? "gear is-on" : "gear"} viewBox="0 0 24 24" aria-hidden={label ? undefined : true} aria-label={label} role={label ? "img" : undefined}>
      <path
        fill="currentColor"
        d="M19.4 13.5a7.7 7.7 0 0 0 .1-1.5 7.7 7.7 0 0 0-.1-1.5l2-1.6a.5.5 0 0 0 .1-.6l-1.9-3.3a.5.5 0 0 0-.6-.2l-2.4 1a7.4 7.4 0 0 0-2.6-1.5l-.4-2.5a.5.5 0 0 0-.5-.4h-3.8a.5.5 0 0 0-.5.4l-.4 2.5a7.4 7.4 0 0 0-2.6 1.5l-2.4-1a.5.5 0 0 0-.6.2L.5 8.3a.5.5 0 0 0 .1.6l2 1.6a7.7 7.7 0 0 0 0 3l-2 1.6a.5.5 0 0 0-.1.6l1.9 3.3a.5.5 0 0 0 .6.2l2.4-1a7.4 7.4 0 0 0 2.6 1.5l.4 2.5a.5.5 0 0 0 .5.4h3.8a.5.5 0 0 0 .5-.4l.4-2.5a7.4 7.4 0 0 0 2.6-1.5l2.4 1a.5.5 0 0 0 .6-.2l1.9-3.3a.5.5 0 0 0-.1-.6l-2-1.6zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z"
      />
    </svg>
  );
}
