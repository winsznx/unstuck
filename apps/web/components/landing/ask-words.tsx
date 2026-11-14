import type { Excerpt } from "./facts";

/**
 * The reviewer's words beside a check: the clause the check tests, with an ellipsis where words were left out, or the
 * whole ask clamped to three lines when no clause is set for this comment.
 */
export function AskWords({ quote, focus, className = "" }: { quote: string; focus: Excerpt | null; className?: string }) {
  if (!focus) return <span className={`line-clamp-3 ${className}`}>{quote}</span>;
  return (
    <span className={className}>
      {focus.cutBefore && "…"}
      {focus.text}
      {focus.cutAfter && "…"}
    </span>
  );
}
