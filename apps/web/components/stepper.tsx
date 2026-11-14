export interface StepperItem {
  id: string;
  title: string;
  detail: string;
  state: "done" | "active" | "upcoming";
  onOpen?: () => void;
}

function Check() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-3.5">
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Stepper({ items }: { items: readonly StepperItem[] }) {
  const activeIndex = items.findIndex((item) => item.state === "active");
  const active = items[activeIndex];
  return (
    <>
      <div className="lg:hidden">
        <p className="text-small text-ink-secondary">
          Step {activeIndex + 1} of {items.length}
          {active && <span className="font-semibold text-ink">: {active.title}</span>}
        </p>
        <div aria-hidden className="mt-2 flex gap-1">
          {items.map((item) => (
            <span key={item.id} className={`h-1 flex-1 rounded-full ${item.state === "upcoming" ? "bg-border" : "bg-ink"}`} />
          ))}
        </div>
      </div>
      <nav aria-label="Steps" className="hidden lg:block">
        <ol className="space-y-1 rounded-sheet border border-border bg-surface p-2 shadow-object">
          {items.map((item, index) => {
            const body = (
              <>
                <span
                  aria-hidden
                  className={`grid size-7 shrink-0 place-items-center rounded-control text-small font-semibold tabular-nums ${
                    item.state === "active"
                      ? "bg-surface text-ink"
                      : item.state === "done"
                        ? "bg-passes-soft text-passes-text"
                        : "border border-border text-ink-muted"
                  }`}
                >
                  {item.state === "done" ? <Check /> : index + 1}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className={`block font-semibold ${item.state === "active" ? "text-on-action" : "text-ink"}`}>{item.title}</span>
                  <span
                    className={`mt-0.5 block text-small wrap-anywhere ${
                      item.state === "active" ? "text-on-action/80" : item.state === "done" ? "text-ink-secondary" : "text-ink-muted"
                    }`}
                  >
                    {item.detail}
                  </span>
                </span>
              </>
            );
            const look = `flex w-full items-start gap-3 rounded-panel px-3 py-3 ${item.state === "active" ? "bg-action" : ""}`;
            return (
              <li key={item.id} aria-current={item.state === "active" ? "step" : undefined}>
                {item.onOpen ? (
                  <button type="button" onClick={item.onOpen} className={`${look} transition-colors duration-(--duration-fast) hover:bg-surface-muted`}>
                    {body}
                    <span className="sr-only">, change it</span>
                  </button>
                ) : (
                  <div className={look}>{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
