import type { ReactNode } from "react";

/** The opening of a reading page: a title, one lead paragraph, and an optional aside such as a status tag. */
export function PageHead({ title, lead, aside, children }: { title: ReactNode; lead: ReactNode; aside?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mx-auto max-w-(--container-content) px-4 pt-12 sm:px-6 lg:pt-16">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
        <div className="min-w-0">
          <h1 className="max-w-[20ch] text-display font-semibold text-balance">{title}</h1>
          <p className="mt-5 max-w-[42rem] text-lead text-ink-secondary">{lead}</p>
        </div>
        {aside && <div className="min-w-0 lg:max-w-[22rem] lg:pb-2">{aside}</div>}
      </div>
      {children}
    </header>
  );
}

/** A section heading with its lead, used down the length of a reading page. */
export function SectionHead({ id, title, lead, aside, className = "" }: { id: string; title: ReactNode; lead?: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-10 gap-y-4 ${className}`}>
      <div className="min-w-0">
        <h2 id={id} className="text-section font-semibold text-balance">
          {title}
        </h2>
        {lead && <p className="mt-3 max-w-[40rem] text-lead text-ink-secondary">{lead}</p>}
      </div>
      {aside}
    </div>
  );
}
