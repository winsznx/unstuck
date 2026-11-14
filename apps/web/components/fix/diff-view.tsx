import { parsePatch, type DiffFile } from "@/lib/fix-shared";
import { plural } from "@/lib/format";

const STATUS: Record<DiffFile["status"], string> = {
  added: "New file",
  deleted: "Deleted",
  modified: "Changed",
  renamed: "Renamed",
};

const ROW = {
  add: "bg-passes-soft",
  del: "bg-fails-soft",
  ctx: "",
} as const;

const SIGN = { add: "+", del: "-", ctx: " " } as const;

/** The agent's change, file by file, exactly as the patch has it. Long files start folded. */
export function DiffView({ patch, openFirst = 3 }: { patch: string; openFirst?: number }) {
  const files = parsePatch(patch);
  if (files.length === 0) {
    return <p className="rounded-panel border border-dashed border-border-strong px-4 py-4 text-body text-ink-secondary">The patch has no file changes UNSTUCK can show.</p>;
  }
  const additions = files.reduce((n, f) => n + f.additions, 0);
  const deletions = files.reduce((n, f) => n + f.deletions, 0);
  return (
    <div className="space-y-3">
      <p className="text-small text-ink-secondary">
        {plural(files.length, "file", "files")} changed, <span className="font-medium text-passes-text tabular-nums">{additions} added</span>,{" "}
        <span className="font-medium text-fails-text tabular-nums">{deletions} removed</span>
      </p>
      {files.map((file, i) => (
        <details key={`${file.path}-${i}`} open={i < openFirst} className="group overflow-hidden rounded-panel border border-border bg-surface">
          <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-surface-muted px-4 py-2 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-90">
                ›
              </span>
              <span className="min-w-0 font-mono text-small wrap-anywhere text-ink">
                {file.from ? `${file.from} → ` : ""}
                {file.path}
              </span>
            </span>
            <span className="flex items-center gap-3 text-small text-ink-secondary">
              <span>{STATUS[file.status]}</span>
              <span className="tabular-nums text-passes-text">+{file.additions}</span>
              <span className="tabular-nums text-fails-text">-{file.deletions}</span>
            </span>
          </summary>
          {file.binary ? (
            <p className="px-4 py-3 text-small text-ink-secondary">Binary file. Its bytes aren&apos;t shown.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono log-type">
                <caption className="sr-only">Changes to {file.path}</caption>
                {file.hunks.map((hunk, h) => (
                  <tbody key={h}>
                    <tr>
                      <td colSpan={3} className="border-y border-border bg-unsure-soft px-4 py-1 text-ink-muted">
                        {hunk.header}
                      </td>
                    </tr>
                    {hunk.lines.map((line, l) => (
                      <tr key={l} className={ROW[line.kind]}>
                        <td className="w-10 px-2 text-right align-top text-ink-muted tabular-nums select-none">{line.oldNo ?? ""}</td>
                        <td className="w-10 px-2 text-right align-top text-ink-muted tabular-nums select-none">{line.newNo ?? ""}</td>
                        <td className="px-2 align-top whitespace-pre-wrap text-ink wrap-anywhere">
                          <span aria-hidden="true" className="mr-2 text-ink-muted select-none">
                            {SIGN[line.kind]}
                          </span>
                          <span className="sr-only">{line.kind === "add" ? "Added: " : line.kind === "del" ? "Removed: " : ""}</span>
                          {line.text || " "}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          )}
        </details>
      ))}
    </div>
  );
}
