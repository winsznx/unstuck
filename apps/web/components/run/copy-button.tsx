"use client";

import { useState } from "react";

export function CopyButton({ value, label, className = "" }: { value: string; label: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className={`inline-flex min-h-11 shrink-0 items-center rounded-control px-2.5 text-small font-medium text-ink-secondary underline-offset-4 transition-colors duration-(--duration-fast) hover:text-ink hover:underline ${className}`}
    >
      <span aria-live="polite">{state === "copied" ? "Copied" : state === "failed" ? "Copy blocked, select it instead" : "Copy"}</span>
    </button>
  );
}
