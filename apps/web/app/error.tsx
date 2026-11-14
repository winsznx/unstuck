"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/button";
import { HeaderBar } from "@/components/shell/header";
import { StatePanel } from "@/components/shell/state-panel";
import { PunchTag } from "@/components/tag";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <HeaderBar account={undefined} />
      <main id="main-content" className="mx-auto w-full max-w-(--container-content) px-2 pt-10 sm:px-6 sm:pt-16">
        <StatePanel
          tag={<PunchTag verdict="unsure">Page error</PunchTag>}
          title="This page couldn't load"
          actions={
            <>
              <Button onClick={reset}>Try again</Button>
              <ButtonLink href="/m" variant="secondary">
                Your milestones
              </ButtonLink>
            </>
          }
        >
          <p>
            Something failed on our side while building this page. Your milestones and run records are stored and haven&apos;t changed. Try again in a moment.
          </p>
          {error.digest && (
            <p className="mt-3 text-small text-ink-muted">
              If it keeps happening, quote this reference: <span className="font-mono">{error.digest}</span>
            </p>
          )}
        </StatePanel>
      </main>
    </>
  );
}
