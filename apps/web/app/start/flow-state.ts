import type { CodeRead, ThreadRead } from "./actions";
import { imageFor, installFor } from "./repo-shape";

export const STEPS = ["comment", "code", "asks", "steps", "run"] as const;
export type Step = (typeof STEPS)[number];

export interface PickedAsk {
  start: number;
  text: string;
  command: string;
}

export interface FlowState {
  step: Step;
  thread: ThreadRead | null;
  commentId: string | null;
  code: CodeRead | null;
  asks: PickedAsk[];
  image: string;
  install: string;
}

export type FlowAction =
  | { type: "goto"; step: Step }
  | { type: "thread"; thread: ThreadRead }
  | { type: "comment"; commentId: string }
  | { type: "code"; code: CodeRead }
  | { type: "toggleAsk"; start: number; text: string; command: string }
  | { type: "askCommand"; start: number; command: string }
  | { type: "image"; image: string }
  | { type: "install"; install: string };

export function initialState(thread: ThreadRead | null): FlowState {
  return {
    step: "comment",
    thread,
    commentId: thread?.suggestedCommentId ?? null,
    code: null,
    asks: [],
    image: "node:22-bookworm-slim",
    install: "",
  };
}

export function reducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "goto":
      return canOpen(state, action.step) ? { ...state, step: action.step } : state;
    case "thread":
      return initialState(action.thread);
    case "comment":
      return state.commentId === action.commentId
        ? { ...state, step: "code" }
        : { ...state, commentId: action.commentId, asks: [], code: null, step: "code" };
    case "code": {
      const sameCode = state.code?.repoUrl === action.code.repoUrl && state.code.commit.sha === action.code.commit.sha;
      return sameCode
        ? { ...state, step: "asks" }
        : { ...state, code: action.code, image: imageFor(action.code.shape), install: installFor(action.code.shape).command, step: "asks" };
    }
    case "toggleAsk": {
      const exists = state.asks.some((a) => a.start === action.start);
      const asks = exists
        ? state.asks.filter((a) => a.start !== action.start)
        : [...state.asks, { start: action.start, text: action.text, command: action.command }];
      return { ...state, asks: asks.sort((a, b) => a.start - b.start) };
    }
    case "askCommand":
      return { ...state, asks: state.asks.map((a) => (a.start === action.start ? { ...a, command: action.command } : a)) };
    case "image":
      return { ...state, image: action.image };
    case "install":
      return { ...state, install: action.install };
  }
}

function ready(state: FlowState, step: Step): boolean {
  switch (step) {
    case "comment":
      return state.commentId !== null;
    case "code":
      return state.code !== null;
    case "asks":
    case "steps":
      return state.asks.length > 0;
    case "run":
      return false;
  }
}

export function isDone(state: FlowState, step: Step): boolean {
  return ready(state, step) && STEPS.indexOf(state.step) > STEPS.indexOf(step);
}

export function canOpen(state: FlowState, step: Step): boolean {
  const index = STEPS.indexOf(step);
  return STEPS.slice(0, index).every((s) => ready(state, s));
}
