import type { ReactNode } from "react";

/** One group of components on the preview page. */
export function KitSection({ id, title, description, children }: { id: string; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-t border-border py-12 first:border-t-0 first:pt-0">
      <h2 id={`${id}-title`} className="text-h1 font-semibold">
        {title}
      </h2>
      {description && <p className="mt-2 max-w-[44rem] text-body text-ink-secondary">{description}</p>}
      <div className="mt-8 flex flex-col gap-10">{children}</div>
    </section>
  );
}

/** One component in one state, named above it in plain words. */
export function KitExample({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="mb-3 text-small font-medium text-ink-muted">{label}</p>
      {children}
    </div>
  );
}

/** Examples side by side from 768 px, stacked below. */
export function KitGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={`grid grid-cols-1 gap-8 md:grid-cols-2 ${cols === 3 ? "xl:grid-cols-3" : ""}`}>{children}</div>;
}
