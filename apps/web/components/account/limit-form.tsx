"use client";

import { useId } from "react";
import { Button } from "@/components/button";
import { checkLimit, EXPIRY_CHOICES, expiryFrom, MAX_PER_HIRE_CENTS, MAX_TOTAL_CENTS, money, type LimitDraft } from "@/lib/account";
import { day } from "@/lib/format";

const field =
  "min-h-12 w-full min-w-0 rounded-control border border-border-control bg-surface py-0 pr-3.5 pl-8 text-input transition-colors duration-(--duration-fast) hover:border-ink-secondary aria-[invalid=true]:border-fails";

/**
 * The spending limit, written like a work order's "not to exceed" lines. The ruler under the fields
 * shows the total cut into hire-sized pieces, so the two numbers read as one decision.
 */
export function LimitForm({
  draft,
  onChange,
  onReview,
  onBack,
  now,
}: {
  draft: LimitDraft;
  onChange: (draft: LimitDraft) => void;
  onReview: () => void;
  onBack?: () => void;
  now: Date;
}) {
  const id = useId();
  const check = checkLimit(draft);
  const errors = check.ok ? {} : check.errors;
  const until = day(expiryFrom(now, draft.days));

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (check.ok) onReview();
      }}
      className="space-y-7"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Money
          id={`${id}-per`}
          label="Not to exceed, one hire"
          hint={`The most UNSTUCK pays one agent for one fix. Up to ${money(MAX_PER_HIRE_CENTS)}.`}
          value={draft.perHire}
          error={draft.perHire.trim() ? errors.perHire : undefined}
          onChange={(perHire) => onChange({ ...draft, perHire })}
        />
        <Money
          id={`${id}-total`}
          label="Not to exceed, all hires"
          hint={`The most it pays across every hire until the limit ends. Up to ${money(MAX_TOTAL_CENTS)}.`}
          value={draft.total}
          error={draft.total.trim() ? errors.total : undefined}
          onChange={(total) => onChange({ ...draft, total })}
        />
      </div>

      <fieldset>
        <legend className="font-semibold">Good for</legend>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:max-w-md">
          {EXPIRY_CHOICES.map((days) => (
            <label
              key={days}
              className="relative flex min-h-12 cursor-pointer items-center justify-center rounded-control border border-border-control bg-surface text-small font-semibold transition-colors duration-(--duration-fast) hover:border-ink-secondary has-checked:border-ink has-checked:bg-action has-checked:text-on-action has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
            >
              <input type="radio" name={`${id}-days`} value={days} checked={draft.days === days} onChange={() => onChange({ ...draft, days })} className="sr-only" />
              {days} days
            </label>
          ))}
        </div>
        <p className="mt-2 text-small text-ink-muted">Ends {until}. After that, hiring stops until you set a new one.</p>
      </fieldset>

      <HireRuler
        perHireCents={check.ok ? check.perHireCapCents : null}
        totalCents={check.ok ? check.totalCapCents : null}
        emptyText={draft.perHire.trim() && draft.total.trim() ? "Fix the amounts above to see how many hires the limit covers." : undefined}
      />

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
        {onBack && (
          <Button type="button" variant="quiet" onClick={onBack} className="mr-auto">
            Back
          </Button>
        )}
        <Button type="submit" disabled={!check.ok}>
          Review the limit
        </Button>
      </div>
    </form>
  );
}

function Money({
  id,
  label,
  hint,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block font-semibold">
        {label}
      </label>
      <div className="relative mt-2">
        <span aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-input text-ink-muted">
          $
        </span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
          className={field}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-small font-medium text-fails-text">
          {error}
        </p>
      )}
      <p id={`${id}-hint`} className="mt-1.5 text-small text-ink-muted">
        {hint}
      </p>
    </div>
  );
}

const RULER_MAX = 10;

/** The total as a strip, cut into one piece per hire it covers. A leftover sliver is shown and named. */
export function HireRuler({
  perHireCents,
  totalCents,
  emptyText = "Fill in both amounts to see how many hires the limit covers.",
}: {
  perHireCents: number | null;
  totalCents: number | null;
  emptyText?: string;
}) {
  if (perHireCents === null || totalCents === null) {
    return (
      <div className="rounded-panel border border-dashed border-border-strong px-4 py-4 text-small text-ink-muted">
        {emptyText}
      </div>
    );
  }
  const hires = Math.floor(totalCents / perHireCents);
  const leftover = totalCents - hires * perHireCents;
  const shown = Math.min(hires, RULER_MAX);
  const pieceShare = (perHireCents / totalCents) * 100;

  return (
    <figure className="rounded-panel border border-border bg-surface-muted px-4 py-4 sm:px-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-semibold">
          {hires === 1 ? "Covers one hire" : `Covers up to ${hires} hires`} at the per-hire most
        </span>
        <span className="text-small text-ink-muted">
          {money(totalCents)} total, {money(perHireCents)} each
        </span>
      </figcaption>
      <div aria-hidden className="mt-3 flex h-9 gap-1 overflow-hidden">
        {hires > RULER_MAX ? (
          <>
            {Array.from({ length: RULER_MAX - 1 }, (_, i) => (
              <span key={i} className="flex-1 rounded-tag border border-open-edge/60 bg-open" />
            ))}
            <span className="grid flex-[1.6] place-items-center rounded-tag border border-dashed border-open-edge/60 text-tag font-semibold">+{hires - (RULER_MAX - 1)}</span>
          </>
        ) : (
          <>
            {Array.from({ length: shown }, (_, i) => (
              <span key={i} style={{ flexBasis: `${pieceShare}%` }} className="grid shrink-0 place-items-center rounded-tag border border-open-edge/60 bg-open text-tag font-semibold">
                {shown <= 8 ? i + 1 : ""}
              </span>
            ))}
            {leftover > 0 && <span className="min-w-1 flex-1 rounded-tag border border-dashed border-border-strong" />}
          </>
        )}
      </div>
      {leftover > 0 && hires <= RULER_MAX && (
        <p className="mt-2 text-small text-ink-muted">
          {money(leftover)} is left over. It can pay a cheaper hire, never a pricier one.
        </p>
      )}
    </figure>
  );
}
