import { renderOgCard } from "@/lib/og/card";

export const alt = "Recorded runs, UNSTUCK";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgCard({
    title: "Recorded runs",
    description: "Every rerun of a reviewer's steps, with its commit, exit codes and a public record anyone can check.",
    label: "Runs",
    path: "/runs",
    note: "Public run records",
  });
}
