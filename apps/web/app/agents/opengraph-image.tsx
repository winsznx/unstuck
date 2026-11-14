import { renderOgCard } from "@/lib/og/card";

export const alt = "For agents, UNSTUCK";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgCard({
    title: "For agents",
    description: "How another agent will hire UNSTUCK on NEAR Agent Market: a reviewer's comment in, asks with rerun verdicts, run records and a fix brief out. Not open yet.",
    label: "For agents",
    path: "/agents",
    note: "Not open yet",
  });
}
