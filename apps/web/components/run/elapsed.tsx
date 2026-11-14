"use client";

import { useEffect, useState } from "react";

function since(from: number, now: number): string {
  const s = Math.max(0, Math.floor((now - from) / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
}

/** Wall-clock time since a stored timestamp. It counts real seconds, never progress. */
export function Elapsed({ from }: { from: string }) {
  const start = Date.parse(from);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <time dateTime={from} suppressHydrationWarning>
      {since(start, now)}
    </time>
  );
}
