import type { ReactNode } from "react";

export type FoldBreakpoint = "sm" | "md" | "lg" | "xl";
export type FoldHeight = "compact" | "short" | "tight";

/** Whole class names, so Tailwind finds them. `folded` shows the details, `plain` hides the plain copy. */
const BELOW: Record<FoldBreakpoint, { folded: string; plain: string }> = {
  sm: { folded: "max-sm:block", plain: "max-sm:hidden" },
  md: { folded: "max-md:block", plain: "max-md:hidden" },
  lg: { folded: "max-lg:block", plain: "max-lg:hidden" },
  xl: { folded: "max-xl:block", plain: "max-xl:hidden" },
};
/** Below `until` on a screen taller than the short tier, where a phone has the height to show it open. */
const TALL: Record<FoldBreakpoint, { folded: string; plain: string }> = {
  sm: { folded: "max-sm:not-short:hidden", plain: "max-sm:not-short:block" },
  md: { folded: "max-md:not-short:hidden", plain: "max-md:not-short:block" },
  lg: { folded: "max-lg:not-short:hidden", plain: "max-lg:not-short:block" },
  xl: { folded: "max-xl:not-short:hidden", plain: "max-xl:not-short:block" },
};
const AT_HEIGHT: Record<FoldHeight, { folded: string; plain: string }> = {
  compact: { folded: "compact:block", plain: "compact:hidden" },
  short: { folded: "short:block", plain: "short:hidden" },
  tight: { folded: "tight:block", plain: "tight:hidden" },
};

/**
 * Fine print that folds on small or short screens. Below the `until` width, or at the `short` height tier and lower
 * (app/landing.css), it's a native details under `label`; elsewhere the same children show plainly. Both copies are
 * in the page and exactly one is displayed, so assistive tech reads it once. The children render twice, so they must
 * not carry ids. `className` styles both copies; `as` is the plain copy's element. `tall` undoes the `until` fold on a
 * screen taller than the short tier (760 px), such as a tall phone with room to spare.
 */
export function Fold({
  label,
  until,
  short,
  tall = false,
  as: Plain = "div",
  className = "",
  children,
}: {
  label: string;
  until?: FoldBreakpoint;
  short?: FoldHeight;
  tall?: boolean;
  as?: "div" | "p";
  className?: string;
  children: ReactNode;
}) {
  const when = [until && BELOW[until], until && tall && TALL[until], short && AT_HEIGHT[short]].filter((rule) => typeof rule === "object");
  return (
    <>
      <details className={`fold hidden ${when.map((rule) => rule.folded).join(" ")} ${className}`}>
        <summary>{label}</summary>
        {children}
      </details>
      <Plain className={`${when.map((rule) => rule.plain).join(" ")} ${className}`}>{children}</Plain>
    </>
  );
}
