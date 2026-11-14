import type { ReactNode } from "react";

/**
 * The sheet a page shows instead of its content: not found, an error, an empty list, a step that needs something
 * first. A paper sheet on the concrete stage, with a tag that names the state, a title that says what happened,
 * a line that says what to do, and the actions that do it.
 */
export function StatePanel({
  tag,
  title,
  children,
  actions,
  headingLevel = 1,
}: {
  tag?: ReactNode;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div className="stage rounded-stage px-3 py-10 sm:px-10 sm:py-20">
      <div className="max-w-[38rem] rounded-sheet border border-border bg-surface p-6 shadow-sheet sm:p-8">
        {tag}
        <Heading className={`${tag ? "mt-5" : ""} text-h1 font-semibold text-balance`}>{title}</Heading>
        <div className="mt-3 max-w-[32rem] text-body text-ink-secondary">{children}</div>
        {actions && <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
