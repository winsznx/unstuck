import { describe, expect, it } from "vitest";
import { siteUrlFrom } from "./site";

describe("siteUrlFrom", () => {
  it("keeps only the origin", () => {
    expect(siteUrlFrom("https://unstuck.example/")).toBe("https://unstuck.example");
    expect(siteUrlFrom(" http://158.220.85.120:8791/x ")).toBe("http://158.220.85.120:8791");
  });

  it("falls back to localhost when unset or blank", () => {
    expect(siteUrlFrom(undefined)).toBe("http://localhost:3000");
    expect(siteUrlFrom("  ")).toBe("http://localhost:3000");
  });

  it("refuses anything that isn't http(s)", () => {
    expect(() => siteUrlFrom("ftp://unstuck.example")).toThrow(/http\(s\)/);
    expect(() => siteUrlFrom("unstuck.example")).toThrow();
  });
});
