"use client";

import { useActionState } from "react";
import { checkFix, type CheckFixState } from "@/app/m/[id]/check/actions";
import { Button } from "@/components/button";

/** The fix to check: the grantee's own commit or pull request, or the one an agent opened. */
export function CheckFixForm({ milestoneId, repo }: { milestoneId: string; repo: string }) {
  const [state, action, pending] = useActionState<CheckFixState, FormData>(checkFix.bind(null, milestoneId), { error: null });
  const errorId = "check-fix-error";
  return (
    <form action={action} className="w-full">
      <label htmlFor="fix" className="text-small font-semibold">
        Pull request, commit link or commit SHA with the fix
      </label>
      <div className="mt-2 flex flex-col gap-2 rounded-sheet border border-border-control bg-surface p-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus sm:flex-row">
        <input
          id="fix"
          name="fix"
          required
          autoComplete="off"
          spellCheck={false}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? errorId : "check-fix-hint"}
          placeholder={`https://github.com/${repo}/pull/12`}
          className="min-h-12 w-full min-w-0 rounded-control bg-transparent px-3 text-input text-ellipsis focus-visible:outline-none"
        />
        <Button type="submit" size="lg" className="shrink-0" disabled={pending}>
          {pending ? "Reading the change" : "Check this fix"}
        </Button>
      </div>
      {state.error ? (
        <p id={errorId} role="alert" className="mt-2 rounded-panel border border-fails/30 bg-fails-soft px-4 py-3 text-small text-fails-text">
          {state.error}
        </p>
      ) : (
        <p id="check-fix-hint" className="mt-2 text-small text-ink-muted">
          From {repo} or a fork. UNSTUCK takes GitHub&apos;s diff from the reviewed commit to this one and reruns the same steps with it applied.
        </p>
      )}
    </form>
  );
}
