import { renderOgCard } from "@/lib/og/card";

export const alt = "Study of grant milestone reviews, UNSTUCK";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgCard({
    title: "Study of grant milestone reviews",
    description: "What still fails when public grant milestone reviews are rerun on the commit the reviewer saw.",
    label: "Study",
    path: "/study",
    note: "Public reviews, rerun",
  });
}
