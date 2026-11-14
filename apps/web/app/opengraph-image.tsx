import { renderOgCard } from "@/lib/og/card";

export const alt = "UNSTUCK: Your reviewer left one comment. UNSTUCK gets it closed.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgCard({
    title: "Your reviewer left one comment. UNSTUCK gets it closed.",
    description: "UNSTUCK reruns their steps on the commit they reviewed and shows what still fails, with the log line behind every tag.",
    path: "/",
    note: "Grant milestone reviews",
  });
}
