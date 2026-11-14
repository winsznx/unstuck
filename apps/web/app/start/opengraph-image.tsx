import { renderOgCard } from "@/lib/og/card";

export const alt = "Check a milestone review, UNSTUCK";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgCard({
    title: "Check a milestone review",
    description: "Paste the GitHub issue or pull request with your reviewer's comment, pick the asks, give each a check and rerun them on the commit they reviewed.",
    label: "Check a review",
    path: "/start",
    note: "Five steps to a first run",
  });
}
