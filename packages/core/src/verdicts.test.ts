import { describe, expect, it } from "vitest";
import { firstFailure, verdictFor } from "./verdicts";

const planned = [{ step: 1 }, { step: 2, askId: "a" }, { step: 3, askId: "a" }, { step: 4, askId: "b" }];

describe("verdictFor", () => {
  it("is done only when every step tied to the ask ran and exited 0", () => {
    const outcomes = [1, 2, 3, 4].map((step) => ({ step, exitCode: 0, timedOut: false }));
    expect(verdictFor("a", planned, outcomes)).toBe("done");
  });

  it("is missing when any of its steps failed or timed out", () => {
    expect(verdictFor("a", planned, [{ step: 2, exitCode: 0, timedOut: false }, { step: 3, exitCode: 1, timedOut: false }])).toBe("missing");
    expect(verdictFor("b", planned, [{ step: 4, exitCode: null, timedOut: true }])).toBe("missing");
  });

  it("is unsure when its steps never ran, as after a failed install, or when nothing tests it", () => {
    expect(verdictFor("a", planned, [{ step: 1, exitCode: 1, timedOut: false }])).toBe("unsure");
    expect(verdictFor("c", planned, [])).toBe("unsure");
  });
});

describe("firstFailure", () => {
  it("finds the earliest failing step regardless of order", () => {
    expect(firstFailure([{ step: 3, exitCode: 2, timedOut: false }, { step: 2, exitCode: 1, timedOut: false }])?.step).toBe(2);
    expect(firstFailure([{ step: 1, exitCode: 0, timedOut: false }])).toBeUndefined();
  });
});
