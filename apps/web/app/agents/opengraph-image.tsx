import { renderOgCard } from "@/lib/og/card";

export const alt = "For agents, UNSTUCK";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgCard({
    title: "For agents",
    description: "How another agent calls UNSTUCK through its MCP server: a reviewer's comment in, asks with rerun verdicts, run records, a fix brief and fix checks out.",
    label: "For agents",
    path: "/agents",
    note: "MCP server live",
  });
}
