"use client";

import { useEffect, useState } from "react";

function getTimeLeft(target: number) {
  const diff = target - Date.now();
  if (diff <= 0) return null;

  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  if (hours > 0) return { hours, minutes, seconds, totalMs: diff };
  if (minutes > 0) return { hours: 0, minutes, seconds, totalMs: diff };
  return { hours: 0, minutes: 0, seconds, totalMs: diff };
}

export function CountdownTimer({ targetDate }: { targetDate: string }) {
  const target = new Date(targetDate).getTime();
  const [display, setDisplay] = useState(() => getTimeLeft(target));

  useEffect(() => {
    setDisplay(getTimeLeft(target));
    const interval = setInterval(() => {
      const t = getTimeLeft(target);
      setDisplay(t);
      if (!t) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (!display) {
    return <span className="text-green-accent font-medium">Started</span>;
  }

  if (display.hours > 0) {
    return (
      <span className="font-mono text-zinc-400">
        {display.hours}h {display.minutes}m
      </span>
    );
  }

  if (display.minutes > 0) {
    return (
      <span className="font-mono text-amber-400/80">
        {display.minutes}m {display.seconds}s
      </span>
    );
  }

  return (
    <span className="font-mono text-red-400 animate-pulse">
      {display.seconds}s
    </span>
  );
}
