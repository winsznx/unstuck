import { describe, expect, it } from "vitest";
import { jumpFor, placeFor } from "./nav";

describe("placeFor", () => {
  it("maps a path and its children to their place", () => {
    expect(placeFor("/m")?.label).toBe("Milestones");
    expect(placeFor("/m/abc")?.label).toBe("Milestones");
    expect(placeFor("/runs/abc")?.label).toBe("Milestones");
    expect(placeFor("/start")?.label).toBe("Check a review");
    expect(placeFor("/study")?.label).toBe("Study");
  });

  it("leaves the landing page and unrelated paths without a place", () => {
    expect(placeFor("/")).toBeNull();
    expect(placeFor("/mobile")).toBeNull();
  });
});

describe("jumpFor", () => {
  it("reads GitHub issue and pull request links, with or without a comment anchor", () => {
    expect(jumpFor(" https://github.com/a/b/issues/887#issuecomment-1 ")).toEqual({ kind: "thread", url: "https://github.com/a/b/issues/887#issuecomment-1" });
    expect(jumpFor("https://github.com/a/b/pull/12")).toEqual({ kind: "thread", url: "https://github.com/a/b/pull/12" });
  });

  it("reads milestone and run ids and ignores everything else", () => {
    expect(jumpFor("D9E0D85E-8946-4A9F-8340-54F6E3CFA4E4")).toEqual({ kind: "id", id: "d9e0d85e-8946-4a9f-8340-54f6e3cfa4e4" });
    expect(jumpFor("https://github.com/a/b")).toBeNull();
    expect(jumpFor("milestones")).toBeNull();
  });
});
