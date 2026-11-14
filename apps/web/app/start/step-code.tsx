import { useState } from "react";
import { Button } from "@/components/button";
import { day, repoName } from "@/lib/format";
import type { CodeRead, ThreadRead } from "./actions";
import { describeShape } from "./repo-shape";
import { Facts, Hint, inputCls, Problem, Reading, StepActions } from "./ui";

const OTHER = "other";

function daysBetween(earlier: string, later: string): string {
  const hours = (new Date(later).getTime() - new Date(earlier).getTime()) / 3_600_000;
  if (hours < 1) return "less than an hour before the comment";
  if (hours < 48) return `${Math.round(hours)} hours before the comment`;
  return `${Math.round(hours / 24)} days before the comment`;
}

export function CodeStep({
  thread,
  commentAt,
  reviewer,
  code,
  pending,
  error,
  onFind,
  onUse,
  onBack,
}: {
  thread: ThreadRead;
  commentAt: string;
  reviewer: string;
  code: CodeRead | null;
  pending: boolean;
  error: string | null;
  onFind: (repoUrl: string, from: string | undefined) => void;
  onUse: () => void;
  onBack: () => void;
}) {
  const candidates = thread.repoCandidates;
  const initial = code?.repoUrl ?? candidates[0] ?? "";
  const [choice, setChoice] = useState(candidates.includes(initial) ? initial : OTHER);
  const [other, setOther] = useState(candidates.includes(initial) ? "" : initial);
  const repoUrl = (choice === OTHER ? other : choice).trim();
  const found = code && code.repoUrl === repoUrl.replace(/\.git$/, "").replace(/\/$/, "") ? code : null;
  const fromHead = thread.prHead && thread.prHead.repoUrl === repoUrl ? thread.prHead.sha : undefined;

  const where = (url: string) =>
    thread.kind === "pull" && url === `https://github.com/${thread.repo}` ? "The pull request's own repo" : "Linked in the thread";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (found) onUse();
        else onFind(repoUrl, fromHead);
      }}
    >
      <fieldset>
        <legend className="font-semibold">Which repo did {reviewer} review?</legend>
        <Hint>
          {candidates.length
            ? `UNSTUCK found ${candidates.length === 1 ? "one repo" : `${candidates.length} repos`} in the thread. The first is usually the one.`
            : "No repo is linked in the thread. Paste the address of the repo your milestone delivered."}
        </Hint>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {candidates.map((c) => (
            <li key={c}>
              <label
                className={`flex h-full cursor-pointer items-start gap-3 rounded-panel border bg-surface px-4 py-3 transition-colors duration-(--duration-fast) ${choice === c ? "border-ink ring-1 ring-ink" : "border-border hover:border-border-strong"}`}
              >
                <input type="radio" name="repo" className="mt-1 size-4 shrink-0" checked={choice === c} onChange={() => setChoice(c)} />
                <span className="min-w-0">
                  <span className="block font-semibold wrap-anywhere">{repoName(c)}</span>
                  <span className="block text-small text-ink-secondary">{where(c)}</span>
                </span>
              </label>
            </li>
          ))}
          <li className={candidates.length ? "sm:col-span-2" : ""}>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-panel border bg-surface px-4 py-3 transition-colors duration-(--duration-fast) ${choice === OTHER ? "border-ink ring-1 ring-ink" : "border-border hover:border-border-strong"}`}
            >
              <input type="radio" name="repo" className="mt-1 size-4 shrink-0" checked={choice === OTHER} onChange={() => setChoice(OTHER)} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{candidates.length ? "Another repo" : "The repo's address"}</span>
                {choice === OTHER && (
                  <input
                    aria-label="Repo address"
                    type="url"
                    inputMode="url"
                    spellCheck={false}
                    autoFocus={candidates.length > 0}
                    value={other}
                    onChange={(e) => setOther(e.target.value)}
                    placeholder="https://github.com/org/repo"
                    className={`${inputCls} mt-2`}
                  />
                )}
              </span>
            </label>
          </li>
        </ul>
      </fieldset>

      <p className="mt-5 text-small text-ink-secondary">
        {fromHead
          ? `UNSTUCK takes the last commit on the pull request's branch before ${reviewer} commented on ${day(commentAt)}, so it reruns exactly what they saw.`
          : `UNSTUCK takes the last commit on the default branch before ${reviewer} commented on ${day(commentAt)}, so it reruns exactly what they saw.`}
      </p>

      <div className="mt-6" aria-live="polite">
        {pending && (
          <Reading
            label={`Reading ${repoName(repoUrl)} from GitHub`}
            lines={["The commit just before the comment", "The files at that commit", "How the project installs and tests"]}
          />
        )}
        {error && !pending && <Problem title="The commit wasn't found">{error}</Problem>}
        {found && !pending && (
          <div>
            <p className="font-semibold">What {reviewer} was looking at</p>
            <div className="mt-3">
              <Facts
                rows={[
                  {
                    term: "Commit",
                    value: (
                      <a
                        className="font-mono text-small underline decoration-border-strong underline-offset-3 hover:decoration-ink"
                        href={`${found.repoUrl}/commit/${found.commit.sha}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {found.commit.sha.slice(0, 7)}
                      </a>
                    ),
                  },
                  { term: "Message", value: found.commit.message || "No message" },
                  {
                    term: "Committed",
                    value: `${day(found.commit.committedAt)}${found.commit.author ? ` by ${found.commit.author}` : ""}, ${daysBetween(found.commit.committedAt, commentAt)}`,
                  },
                  {
                    term: "Found",
                    value: (
                      <ul className="space-y-0.5">
                        {describeShape(found.shape).map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        )}
      </div>

      <StepActions
        note={found ? `${repoName(found.repoUrl)} at ${found.commit.sha.slice(0, 7)}` : "Nothing is cloned yet. This only reads GitHub."}
        back={
          <Button type="button" variant="quiet" onClick={onBack}>
            Back
          </Button>
        }
      >
        <Button type="submit" disabled={pending || !repoUrl}>
          {found ? "Use this commit" : pending ? "Finding the commit" : "Find the commit"}
        </Button>
      </StepActions>
    </form>
  );
}
