import { Button } from "@/components/button";
import { PunchTag } from "@/components/tag";
import type { CodeRead } from "./actions";
import type { PickedAsk } from "./flow-state";
import { IMAGES } from "./images";
import { describeShape, imageFor, installFor } from "./repo-shape";
import { suggestionsFor } from "./suggest";
import { codeInputCls, StepActions } from "./ui";

function rows(command: string): number {
  return Math.min(6, Math.max(2, Math.ceil(command.length / 64)));
}

export function ChecksStep({
  code,
  asks,
  reviewerCommands,
  image,
  install,
  onImage,
  onInstall,
  onCommand,
  onNext,
  onBack,
}: {
  code: CodeRead;
  asks: PickedAsk[];
  reviewerCommands: string[];
  image: string;
  install: string;
  onImage: (image: string) => void;
  onInstall: (install: string) => void;
  onCommand: (start: number, command: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const plan = installFor(code.shape);
  const suggestedImage = imageFor(code.shape);
  const withCheck = asks.filter((a) => a.command.trim()).length;

  return (
    <>
      <section aria-labelledby="env-title" className="rounded-panel border border-border bg-surface-muted px-4 py-4 sm:px-5">
        <h3 id="env-title" className="font-semibold">
          Setup, with the network on
        </h3>
        <p className="mt-1 text-small text-ink-secondary">
          Runs once, first. If it fails, no check runs and every ask is marked Not sure, so a broken install never reads as missing work.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)]">
          <div>
            <label htmlFor="image" className="text-small font-semibold">
              Container
            </label>
            <select id="image" value={image} onChange={(e) => onImage(e.target.value)} className="mt-1.5 min-h-12 w-full rounded-control border border-border-control bg-surface px-3 font-mono text-small hover:border-ink-secondary">
              {IMAGES.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
            <p className="mt-1.5 text-small text-ink-secondary">
              {image === suggestedImage ? `Matches what's in the repo: ${describeShape(code.shape)[0]?.toLowerCase()}.` : `UNSTUCK suggested ${suggestedImage}.`}
            </p>
          </div>
          <div className="min-w-0">
            <label htmlFor="install" className="text-small font-semibold">
              Install command
            </label>
            <textarea
              id="install"
              rows={rows(install)}
              spellCheck={false}
              value={install}
              onChange={(e) => onInstall(e.target.value)}
              placeholder="Nothing to install"
              className={`${codeInputCls} mt-1.5`}
            />
            <p className="mt-1.5 text-small text-ink-secondary">
              {install === plan.command ? plan.reason : "Edited by you."}
              {install !== plan.command && plan.command && (
                <>
                  {" "}
                  <button type="button" className="font-medium text-ink underline underline-offset-3" onClick={() => onInstall(plan.command)}>
                    Use the suggestion again
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      <h3 className="mt-8 font-semibold">One check per ask, with the network off</h3>
      <p className="mt-1 text-small text-ink-secondary">
        Exit 0 means the ask is met. Anything else marks it Still missing, with the line that failed. Each check gets 10 minutes.
      </p>

      <ol className="mt-4 space-y-4">
        {asks.map((ask, i) => {
          const suggestions = suggestionsFor(ask.text, code.shape, reviewerCommands);
          const current = suggestions.find((s) => s.command === ask.command.trim());
          return (
            <li key={ask.start} className="rounded-panel border border-border bg-surface">
              <div className="flex flex-col items-start gap-2 border-b border-border px-4 py-3.5 sm:flex-row sm:gap-3 sm:px-5">
                <span className="shrink-0 sm:mt-1">
                  <PunchTag verdict={ask.command.trim() ? "open" : "unsure"} n={i + 1} />
                </span>
                <p className="min-w-0 font-quote text-body leading-relaxed wrap-anywhere">{ask.text}</p>
              </div>
              <div className="px-4 py-4 sm:px-5">
                {suggestions.length > 0 && (
                  <div className="mb-3">
                    <p className="text-small font-semibold">Suggested</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {suggestions.map((s) => {
                        const on = s.command === ask.command.trim();
                        return (
                          <li key={s.command}>
                            <button
                              type="button"
                              aria-pressed={on}
                              onClick={() => onCommand(ask.start, s.command)}
                              className={`block w-full rounded-control border px-3 py-2 text-left transition-colors duration-(--duration-fast) ${on ? "border-ink bg-surface-muted" : "border-border hover:border-border-strong"}`}
                            >
                              <span className="block truncate font-mono text-small text-ink">{s.command}</span>
                              <span className="mt-0.5 block text-small text-ink-secondary">{s.reason}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <label htmlFor={`check-${ask.start}`} className="text-small font-semibold">
                  Check command
                </label>
                <textarea
                  id={`check-${ask.start}`}
                  rows={rows(ask.command)}
                  spellCheck={false}
                  value={ask.command}
                  onChange={(e) => onCommand(ask.start, e.target.value)}
                  placeholder="The command your reviewer would run to see this ask is met"
                  className={`${codeInputCls} mt-1.5`}
                />
                <p className="mt-1.5 text-small text-ink-secondary">
                  {!ask.command.trim()
                    ? "No check: this ask will be marked Not sure. Nothing is guessed."
                    : current
                      ? "Runs inside the repo folder at that commit."
                      : "Your own command. Runs inside the repo folder at that commit."}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <StepActions
        note={`${withCheck} of ${asks.length} ${asks.length === 1 ? "ask has" : "asks have"} a check`}
        back={
          <Button type="button" variant="quiet" onClick={onBack}>
            Back
          </Button>
        }
      >
        <Button type="button" onClick={onNext}>
          Review the run
        </Button>
      </StepActions>
    </>
  );
}
