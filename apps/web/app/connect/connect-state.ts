import { DEFAULT_LIMIT, type DeviceFlow, type LimitDraft } from "../../lib/account";

export const CONNECT_STEPS = ["about", "code", "limit", "confirm"] as const;
export type ConnectStep = (typeof CONNECT_STEPS)[number];

export interface ConnectState {
  step: ConnectStep;
  flow: DeviceFlow;
  draft: LimitDraft;
  /** Set once the limit form passed checkLimit; the confirm step reads it. */
  limitChecked: boolean;
  saved: boolean;
}

export const INITIAL_CONNECT: ConnectState = { step: "about", flow: { kind: "idle" }, draft: DEFAULT_LIMIT, limitChecked: false, saved: false };

export type ConnectAction =
  | { type: "goto"; step: ConnectStep }
  | { type: "flow"; flow: DeviceFlow }
  | { type: "draft"; draft: LimitDraft }
  | { type: "limitChecked" }
  | { type: "saved" };

export function signedIn(state: ConnectState): boolean {
  return state.flow.kind === "approved";
}

/**
 * About and the code step are always open. The limit form can be read before sign-in, so the owner
 * sees what they'll be asked, but nothing saves until Agent Market approved the code.
 */
export function canOpenStep(state: ConnectState, step: ConnectStep): boolean {
  switch (step) {
    case "about":
    case "code":
    case "limit":
      return !state.saved;
    case "confirm":
      return !state.saved && state.limitChecked;
  }
}

export function connectReducer(state: ConnectState, action: ConnectAction): ConnectState {
  switch (action.type) {
    case "goto":
      return canOpenStep(state, action.step) ? { ...state, step: action.step } : state;
    case "flow":
      return { ...state, flow: action.flow, step: action.flow.kind === "approved" && state.step === "code" ? "limit" : state.step };
    case "draft":
      return { ...state, draft: action.draft, limitChecked: false };
    case "limitChecked":
      return { ...state, limitChecked: true, step: "confirm" };
    case "saved":
      return signedIn(state) && state.limitChecked ? { ...state, saved: true } : state;
  }
}
