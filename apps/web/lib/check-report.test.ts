import { describe, expect, it } from "vitest";
import { checkReport } from "./check-report";
import { sampleView } from "./sample";

const ORIGIN = "https://unstuck.example";

describe("checkReport", () => {
  it("links each failing ask to its step in the run record", () => {
    const report = checkReport(sampleView("missing"), ORIGIN);
    expect(report.status).toBe("still_missing");
    expect(report.asks[1]?.failure?.record).toBe(`${ORIGIN}/runs/00000000-0000-4000-8000-00000000c001#step-2`);
  });

  it("writes a brief that quotes every open ask and the bar a fix must clear", () => {
    const { brief } = checkReport(sampleView("mixed"), ORIGIN);
    expect(brief.split("\n")).toEqual([
      "sample-reviewer asked for one thing that is still missing at 4b1d9e0:",
      `1. "Please host them on one site so the committee can verify the guides." Check "docs site is configured" exits 1: error: no docs site config found (mkdocs, docusaurus, mdbook).`,
      "A fix is done when the same checks exit 0 on the patch.",
    ]);
  });

  it("reports works only when every ask works", () => {
    expect(checkReport(sampleView("works"), ORIGIN).status).toBe("works");
    expect(checkReport(sampleView("works"), ORIGIN).brief).toBe("Nothing is still missing at the reviewed commit.");
  });

  it("never turns a run that couldn't start or hasn't finished into a verdict", () => {
    expect(checkReport(sampleView("error"), ORIGIN).status).toBe("could_not_run");
    expect(checkReport(sampleView("running"), ORIGIN).status).toBe("running");
    expect(checkReport(sampleView("no-checks"), ORIGIN)).toMatchObject({ status: "no_checks", runRecord: null });
  });
});
