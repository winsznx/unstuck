import { plural, repoName, sha7 } from "@/lib/format";
import { renderOgCard, type OgTag } from "@/lib/og/card";
import { programOf } from "@/lib/programs";
import { replayView } from "@/lib/queries";
import { stepRows } from "@/lib/status";

export const alt = "An UNSTUCK run record";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GENERIC = {
  title: "Run record",
  description: "A rerun of a reviewer's steps, with its commit, exit codes and a public record anyone can check.",
  label: "Run record",
  note: "Public run record",
};

/**
 * The card for one run, from the stored record: the repo and commit, and how many checks passed and failed. A run that
 * doesn't exist, or a read that fails, gets the generic card, since a share preview should never be an error.
 */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = `/runs/${id}`;
  const view = await replayView(id).catch(() => null);
  if (!view) return renderOgCard({ ...GENERIC, path: "/runs" });

  const { replay, results, milestone } = view;
  const where = `${repoName(milestone.codeRepoUrl)} at ${sha7(replay.sha)}`;
  const against = replay.target === "patch" ? "with a proposed fix applied" : `the commit the ${programOf(milestone.threadRepo)} reviewer saw`;
  const rows = stepRows(replay, results);

  let description: string;
  const tags: OgTag[] = [];
  if (replay.status === "finished") {
    const passed = rows.filter((row) => row.state === "passed").length;
    const failed = rows.filter((row) => row.state === "failed" || row.state === "timed-out").length;
    const skipped = rows.filter((row) => row.state === "skipped").length;
    description = `A rerun of ${plural(rows.length, "check", "checks")} on ${against}.`;
    if (failed > 0) tags.push({ verdict: "missing", label: `${failed} failed` });
    if (passed > 0) tags.push({ verdict: "works", label: `${passed} passed` });
    if (skipped > 0) tags.push({ verdict: "unsure", label: `${skipped} didn't run` });
  } else if (replay.status === "error") {
    description = `The runner stopped before any of the reviewer's steps ran on ${against}, so no step passed or failed.`;
  } else {
    description = `A rerun on ${against}, ${replay.status === "running" ? "running now" : "waiting to start"}.`;
  }

  return renderOgCard({ title: where, description, label: "Run record", path, note: plural(rows.length, "check", "checks"), tags, balanceTitle: false });
}
