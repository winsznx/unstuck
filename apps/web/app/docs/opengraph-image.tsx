import { renderOgCard } from "@/lib/og/card";

export const alt = "UNSTUCK Docs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgCard({
    title: "UNSTUCK Docs",
    description: "How UNSTUCK checks a grant milestone review: asks, checks, reruns, run records, what it won't do and what it saves.",
    label: "Docs",
    path: "/docs",
    note: "Guides and reference",
  });
}
