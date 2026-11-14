import type { AskVerdict } from "@unstuck/core";

export type TagVerdict = "open" | "missing" | "works" | "unsure" | "fixed";

export const TAG_LABEL: Record<TagVerdict, string> = {
  open: "Open",
  missing: "Still missing",
  works: "Works",
  unsure: "Not sure",
  fixed: "Fixed",
};

export const tagFor = (verdict: AskVerdict | "open"): TagVerdict => (verdict === "done" ? "works" : verdict);

export function PunchTag({
  verdict,
  children,
  n,
  size = "md",
}: {
  verdict: TagVerdict;
  children?: string;
  /** The ask's number on the punch list, shown before the label. */
  n?: number;
  size?: "md" | "lg";
}) {
  return (
    <span className="punch-tag" data-verdict={verdict} data-size={size}>
      {n !== undefined && <span className="punch-tag-n">{n}</span>}
      {children ?? TAG_LABEL[verdict]}
    </span>
  );
}
