"use client";

import { useId, useState } from "react";
import { CopyButton } from "../run/copy-button";

/** An editable draft the owner copies and posts themselves. Reset brings back what UNSTUCK wrote. */
export function DraftEditor({ label, initial, rows = 12, hint, mono = false }: { label: string; initial: string; rows?: number; hint?: string; mono?: boolean }) {
  const id = useId();
  const [value, setValue] = useState(initial);
  const edited = value !== initial;
  return (
    <div className="overflow-hidden rounded-panel border border-border-control bg-surface focus-within:border-ink">
      <div className="flex flex-wrap items-center justify-between gap-x-3 border-b border-border bg-surface-muted pl-4">
        <label htmlFor={id} className="py-2 text-small font-semibold">
          {label}
          {edited && <span className="ml-2 font-normal text-ink-secondary">edited</span>}
        </label>
        <span className="flex items-center">
          {edited && (
            <button
              type="button"
              onClick={() => setValue(initial)}
              className="inline-flex min-h-11 items-center px-2.5 text-small font-medium text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
            >
              Reset
            </button>
          )}
          <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />
        </span>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={rows}
        spellCheck
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={`block w-full resize-y bg-surface px-4 py-3 text-ink outline-none ${mono ? "font-mono log-type" : "text-body"}`}
      />
      {hint && (
        <p id={`${id}-hint`} className="border-t border-border px-4 py-2 text-small text-ink-secondary">
          {hint}
        </p>
      )}
    </div>
  );
}
