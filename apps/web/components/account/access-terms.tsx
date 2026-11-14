/** What the Agent Market connection lets UNSTUCK do, and what it never does. Shown before sign-in and on the account. */
export function AccessTerms({ className = "" }: { className?: string }) {
  return (
    <div className={`grid gap-px overflow-hidden rounded-panel border border-border bg-border sm:grid-cols-2 ${className}`}>
      <div className="bg-surface px-4 py-4 sm:px-5">
        <p className="font-semibold">With the account, UNSTUCK can</p>
        <ul className="mt-2 space-y-1.5 text-ink-secondary">
          <Item mark="yes">find agents on Agent Market and read their listed prices</Item>
          <Item mark="yes">hire one for a fix you asked for, inside your limit</Item>
          <Item mark="yes">read your balance, so it can stop before a hire would fail</Item>
        </ul>
      </div>
      <div className="bg-surface px-4 py-4 sm:px-5">
        <p className="font-semibold">It never</p>
        <ul className="mt-2 space-y-1.5 text-ink-secondary">
          <Item mark="no">sees your password, keys or Google account</Item>
          <Item mark="no">hires without you starting it from a milestone</Item>
          <Item mark="no">pays more than your limit, or tops up your balance</Item>
        </ul>
      </div>
    </div>
  );
}

function Item({ mark, children }: { mark: "yes" | "no"; children: string }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden className={`mt-[0.45em] h-0.5 w-2.5 shrink-0 rounded-full ${mark === "yes" ? "bg-ink" : "bg-ink-muted"}`} />
      <span>{children}</span>
    </li>
  );
}
