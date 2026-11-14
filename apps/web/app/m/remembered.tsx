"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/button";
import { MilestoneList } from "@/components/fix/milestone-list";
import { forget, readRemembered } from "@/components/fix/remember";
import { milestoneSummaries, type MilestoneSummary } from "./actions";

type State = { kind: "loading" } | { kind: "ready"; items: MilestoneSummary[] } | { kind: "error" };

/** Reads the milestone ids this browser kept, then asks the server for just those. */
export function RememberedMilestones() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    const ids = readRemembered();
    if (ids.length === 0) {
      setState({ kind: "ready", items: [] });
      return;
    }
    milestoneSummaries(ids)
      .then((items) => live && setState({ kind: "ready", items }))
      .catch(() => live && setState({ kind: "error" }));
    return () => {
      live = false;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading your milestones" className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-panel bg-surface-muted motion-reduce:animate-none" />
        ))}
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <p role="alert" className="rounded-panel border border-dashed border-border-strong px-5 py-5 text-body text-ink-secondary">
        Your milestones couldn&apos;t be loaded. Reload the page to try again.
      </p>
    );
  }
  if (state.items.length === 0) {
    return (
      <div className="rounded-sheet border border-dashed border-border-strong px-6 py-10 text-center">
        <p className="text-h2 font-semibold">No milestones in this browser yet</p>
        <p className="mx-auto mt-2 max-w-md text-body text-ink-secondary">
          Paste the link to the review comment that&apos;s holding your payment. UNSTUCK reruns your reviewer&apos;s steps and the milestone shows up here.
        </p>
        <ButtonLink href="/start" className="mt-6">
          Start a milestone
        </ButtonLink>
      </div>
    );
  }
  return (
    <MilestoneList
      items={state.items}
      onForget={(id) => {
        forget(id);
        setState({ kind: "ready", items: state.items.filter((i) => i.id !== id) });
      }}
    />
  );
}
