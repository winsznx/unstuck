import Link from "next/link";
import { Button } from "./button";
import { Fold } from "./landing/fold";

/**
 * The one front door: a GitHub issue or pull request link, sent to /start as a GET so it works without JavaScript.
 * /start finds the reviewer's comment in the thread, so a link to one comment works too.
 *
 * `fit` is for a form that shares one screen with a headline, as in the landing hero: the field and the button sit side
 * by side only while the form is wide enough to leave the field room for a link, whatever the viewport, and below
 * 768 px the hint folds under a summary. The hint's wrapper keeps the field's description, so a folded hint still
 * describes it by its summary.
 */
export function UrlForm({ id = "url", tone = "page", fit = false }: { id?: string; tone?: "page" | "stage"; fit?: boolean }) {
  const hintId = `${id}-hint`;
  const hintClass = `mt-2 text-small text-pretty ${tone === "stage" ? "text-ink-secondary" : "text-ink-muted"}`;
  const hint = (
    <>
      Any public issue or PR with the asks in a comment. Linked evaluation files aren&apos;t read yet. Nothing runs or is saved until you start the run
      in the last step. Then it gets a permanent public record, listed under{" "}
      <Link href="/runs" className="underline underline-offset-4 hover:text-ink">
        Recorded runs
      </Link>
      . Free, and nothing is posted on GitHub.
    </>
  );
  return (
    <form action="/start" method="get" className={fit ? "@container w-full" : "w-full"}>
      <label htmlFor={id} className="text-small font-semibold">
        GitHub issue or PR with the review
      </label>
      <div
        className={`mt-2 flex flex-col gap-2 rounded-sheet border p-2 ${fit ? "@min-[26rem]:flex-row" : "sm:flex-row"} ${tone === "stage" ? "border-border-strong bg-surface" : "border-border-control bg-surface"} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus`}
      >
        <input
          id={id}
          name="url"
          type="url"
          required
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          aria-describedby={hintId}
          placeholder="https://github.com/org/repo/pull/123"
          className="min-h-12 w-full min-w-0 rounded-control bg-transparent px-3 text-input text-ellipsis focus-visible:outline-none"
        />
        <Button type="submit" size="lg" className="shrink-0">
          Find what&apos;s missing
        </Button>
      </div>
      {fit ? (
        <div id={hintId}>
          <Fold label="What it reads and saves" until="md" as="p" className={hintClass}>
            {hint}
          </Fold>
        </div>
      ) : (
        <p id={hintId} className={hintClass}>
          {hint}
        </p>
      )}
    </form>
  );
}
