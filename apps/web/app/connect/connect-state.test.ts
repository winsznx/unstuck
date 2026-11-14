import { describe, expect, it } from "vitest";
import { canOpenStep, connectReducer, INITIAL_CONNECT, type ConnectState } from "./connect-state";

const approved: ConnectState = { ...INITIAL_CONNECT, step: "code", flow: { kind: "approved", identity: { handle: "ada", nearAccountId: "ada.near" } } };

describe("connectReducer", () => {
  it("moves to the limit once the code is approved", () => {
    expect(connectReducer(approved, { type: "flow", flow: approved.flow }).step).toBe("limit");
  });

  it("stays on the code step while the code is pending or unavailable", () => {
    const next = connectReducer({ ...INITIAL_CONNECT, step: "code" }, { type: "flow", flow: { kind: "unavailable", reason: "off" } });
    expect(next.step).toBe("code");
  });

  it("only opens confirm after the limit passed its checks", () => {
    expect(canOpenStep(INITIAL_CONNECT, "confirm")).toBe(false);
    const checked = connectReducer(INITIAL_CONNECT, { type: "limitChecked" });
    expect(checked.step).toBe("confirm");
  });

  it("forgets the check when the limit changes", () => {
    const checked = connectReducer(INITIAL_CONNECT, { type: "limitChecked" });
    expect(connectReducer(checked, { type: "draft", draft: { perHire: "10", total: "10", days: 7 } }).limitChecked).toBe(false);
  });

  it("refuses to save without a signed-in account", () => {
    const checked = connectReducer(INITIAL_CONNECT, { type: "limitChecked" });
    expect(connectReducer(checked, { type: "saved" }).saved).toBe(false);
  });

  it("saves when signed in and checked, then locks the steps", () => {
    const ready = connectReducer({ ...approved, step: "limit" }, { type: "limitChecked" });
    const saved = connectReducer(ready, { type: "saved" });
    expect(saved.saved).toBe(true);
    expect(connectReducer(saved, { type: "goto", step: "code" }).step).toBe("confirm");
  });
});
