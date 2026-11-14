"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useReducer, useRef, useState, useTransition, type ReactNode } from "react";
import { day, repoName } from "@/lib/format";
import { readCode, readThread, startMilestone, type CodeRead, type Result, type ThreadRead } from "./actions";
import { canOpen, initialState, isDone, reducer, STEPS, type FlowAction, type FlowState, type Step } from "./flow-state";
import type { IMAGES } from "./images";
import { AsksStep } from "./step-asks";
import { ChecksStep } from "./step-checks";
import { CodeStep } from "./step-code";
import { CommentStep } from "./step-comment";
import { RunStep } from "./step-run";
import { Stepper, type StepperItem } from "@/components/stepper";
import { reviewerCommands, suggestionsFor } from "./suggest";

const TEXT: Record<Step, { title: string; lead: string; ahead: string }> = {
  comment: {
    title: "Your reviewer's comment",
    lead: "Paste the link to the comment that's holding your payment. UNSTUCK reads the whole public thread. It doesn't sign in or post.",
    ahead: "The link to one GitHub comment",
  },
  code: {
    title: "The code they reviewed",
    lead: "The repo and the exact commit your reviewer looked at, so the rerun shows what they saw and not what's on main today.",
    ahead: "Repo and commit, found for you",
  },
  asks: {
    title: "What they asked for",
    lead: "Pick each sentence where your reviewer asks for something. Each one becomes an item on your punch list with its own tag.",
    ahead: "The sentences to close",
  },
  steps: {
    title: "How to check each ask",
    lead: "One command per ask that proves it's met, plus the install. UNSTUCK suggests commands from the repo and the comment. You can change any of them.",
    ahead: "Setup and one check per ask",
  },
  run: {
    title: "Run it",
    lead: "Check everything once. The run starts on a fresh copy and your milestone page fills in as each step finishes.",
    ahead: "Review, then the first run",
  },
};

function detail(state: FlowState, step: Step): string {
  const comment = state.thread?.comments.find((c) => c.id === state.commentId);
  if (!isDone(state, step)) return TEXT[step].ahead;
  switch (step) {
    case "comment":
      return comment ? `${comment.author}, ${day(comment.createdAt)}` : TEXT.comment.ahead;
    case "code":
      return state.code ? `${repoName(state.code.repoUrl)} at ${state.code.commit.sha.slice(0, 7)}` : TEXT.code.ahead;
    case "asks":
      return `${state.asks.length} ${state.asks.length === 1 ? "ask" : "asks"} picked`;
    case "steps": {
      const checks = state.asks.filter((a) => a.command.trim()).length;
      return `${checks} of ${state.asks.length} with a check, ${state.image}`;
    }
    case "run":
      return TEXT.run.ahead;
  }
}

export function StartFlow({ initialUrl, initial }: { initialUrl: string; initial: Result<ThreadRead> | null }) {
  const [state, rawDispatch] = useReducer(reducer, initial?.ok ? initial.value : null, initialState);
  const [error, setError] = useState<string | null>(initial && !initial.ok ? initial.error : null);
  const [draftCode, setDraftCode] = useState<CodeRead | null>(null);
  const [startedId, setStartedId] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState(initialUrl);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  const dispatch = (action: FlowAction) => {
    if (action.type === "goto" || action.type === "comment" || action.type === "code") setError(null);
    rawDispatch(action);
  };

  const run = <T,>(work: () => Promise<Result<T>>, then: (value: T) => void) =>
    startTransition(async () => {
      setError(null);
      const result = await work();
      if (result.ok) then(result.value);
      else setError(result.error);
    });

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [state.step]);

  const comment = state.thread?.comments.find((c) => c.id === state.commentId) ?? null;
  const fromReviewer = useMemo(() => (comment ? reviewerCommands(comment.body) : []), [comment]);
  const index = STEPS.indexOf(state.step);

  const items: StepperItem[] = STEPS.map((step) => {
    const openable = canOpen(state, step) && state.step !== step && !startedId;
    return {
      id: step,
      title: TEXT[step].title,
      detail: detail(state, step),
      state: state.step === step ? "active" : isDone(state, step) ? "done" : "upcoming",
      ...(openable ? { onOpen: () => dispatch({ type: "goto", step }) } : {}),
    };
  });

  let body: ReactNode = null;
  switch (state.step) {
    case "comment":
      body = (
        <CommentStep
          key={state.thread?.threadUrl ?? "empty"}
          initialUrl={lastUrl}
          thread={state.thread}
          commentId={state.commentId}
          pending={pending}
          error={error}
          onRead={(url) => {
            setLastUrl(url);
            run(
              () => readThread(url),
              (thread) => {
                setDraftCode(null);
                rawDispatch({ type: "thread", thread });
              },
            );
          }}
          onPick={(id) => dispatch({ type: "comment", commentId: id })}
        />
      );
      break;
    case "code":
      if (state.thread && comment)
        body = (
          <CodeStep
            thread={state.thread}
            commentAt={comment.createdAt}
            reviewer={comment.author}
            code={draftCode ?? state.code}
            pending={pending}
            error={error}
            onFind={(repoUrl, from) => run(() => readCode(repoUrl, comment.createdAt, from), setDraftCode)}
            onUse={() => {
              const chosen = draftCode ?? state.code;
              if (chosen) dispatch({ type: "code", code: chosen });
            }}
            onBack={() => dispatch({ type: "goto", step: "comment" })}
          />
        );
      break;
    case "asks":
      if (comment)
        body = (
          <AsksStep
            comment={comment}
            asks={state.asks}
            onToggle={(s) =>
              dispatch({
                type: "toggleAsk",
                start: s.start,
                text: s.text,
                command: suggestionsFor(s.text, state.code?.shape ?? null, fromReviewer)[0]?.command ?? "",
              })
            }
            onNext={() => dispatch({ type: "goto", step: "steps" })}
            onBack={() => dispatch({ type: "goto", step: "code" })}
          />
        );
      break;
    case "steps":
      if (state.code)
        body = (
          <ChecksStep
            code={state.code}
            asks={state.asks}
            reviewerCommands={fromReviewer}
            image={state.image}
            install={state.install}
            onImage={(image) => dispatch({ type: "image", image })}
            onInstall={(install) => dispatch({ type: "install", install })}
            onCommand={(start, command) => dispatch({ type: "askCommand", start, command })}
            onNext={() => dispatch({ type: "goto", step: "run" })}
            onBack={() => dispatch({ type: "goto", step: "asks" })}
          />
        );
      break;
    case "run":
      if (comment && state.code && state.thread) {
        const thread = state.thread;
        const code = state.code;
        body = (
          <RunStep
            state={state}
            comment={comment}
            code={code}
            pending={pending}
            error={error}
            startedId={startedId}
            onEdit={(step) => dispatch({ type: "goto", step })}
            onRun={() =>
              run(
                () =>
                  startMilestone({
                    threadUrl: thread.threadUrl,
                    commentId: comment.id,
                    codeRepoUrl: code.repoUrl,
                    sha: code.commit.sha,
                    image: state.image as (typeof IMAGES)[number],
                    install: state.install,
                    asks: state.asks,
                  }),
                (id) => {
                  setStartedId(id);
                  router.push(`/m/${id}`);
                },
              )
            }
          />
        );
      }
      break;
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:items-start lg:gap-10">
      <aside className="space-y-5 lg:sticky lg:top-6">
        <Stepper items={items} />
        <div className="hidden rounded-panel border border-border px-4 py-4 text-small text-ink-secondary lg:block">
          <p className="font-semibold text-ink">What UNSTUCK touches</p>
          <ul className="mt-2 space-y-1.5">
            <li>Reads public GitHub. No sign-in.</li>
            <li>Runs your reviewer&apos;s steps in a sealed container.</li>
            <li>Posts nothing and charges nothing.</li>
          </ul>
        </div>
      </aside>

      <section aria-labelledby="step-title" className="min-w-0 rounded-sheet border border-border bg-surface px-4 pt-5 shadow-object sm:px-8 sm:pt-8">
        <p className="hidden text-small font-medium text-ink-secondary tabular-nums lg:block">
          Step {index + 1} of {STEPS.length}
        </p>
        <h2 id="step-title" ref={headingRef} tabIndex={-1} className="scroll-mt-24 text-h1 lg:mt-1 font-semibold outline-none">
          {TEXT[state.step].title}
        </h2>
        <p className="mt-2 max-w-(--container-reading) text-ink-secondary">{TEXT[state.step].lead}</p>
        <div className="mt-7 pb-6 sm:pb-8">{body}</div>
      </section>
    </div>
  );
}
