import { describe, expect, it } from "vitest";
import { parseThemePreference, resolveTheme } from "./theme";

describe("theme preference", () => {
  it("treats anything but light or dark as following the system", () => {
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference(null)).toBe("system");
    expect(parseThemePreference("sepia")).toBe("system");
  });

  it("resolves system from the device and keeps an explicit choice", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
