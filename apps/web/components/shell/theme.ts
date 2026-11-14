/**
 * Theme plumbing with no React in it, so the root layout (a server component) can inline the boot script.
 * The choice lives in localStorage under THEME_STORAGE_KEY as "light" or "dark"; no entry follows the system.
 * tokens.css keys the dark theme off data-theme on <html>.
 */

export const THEME_STORAGE_KEY = "unstuck:theme";
export const THEME_EVENT = "unstuck:theme";
export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = Exclude<ThemePreference, "system">;

const DARK_QUERY = "(prefers-color-scheme: dark)";

export function parseThemePreference(stored: string | null): ThemePreference {
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference !== "system") return preference;
  return systemPrefersDark ? "dark" : "light";
}

/**
 * Runs in <head> before first paint, so a dark page never flashes light. It mirrors parseThemePreference and
 * resolveTheme, follows the system while the preference is "system", and picks up a choice made in another tab.
 * Storage that throws leaves the system setting in charge.
 */
export const THEME_BOOT_SCRIPT = `(function(){var d=document.documentElement,k=${JSON.stringify(THEME_STORAGE_KEY)},m=window.matchMedia?window.matchMedia(${JSON.stringify(DARK_QUERY)}):null;function p(){try{var s=localStorage.getItem(k);return s==="light"||s==="dark"?s:"system"}catch(e){return"system"}}function a(){var t=p();d.dataset.theme=t==="system"?(m&&m.matches?"dark":"light"):t;d.dataset.themePreference=t}a();if(m&&m.addEventListener)m.addEventListener("change",a);window.addEventListener("storage",function(e){if(e.key===null||e.key===k)a()})})();`;

export function readThemePreference(): ThemePreference {
  try {
    return parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

/** Saves the choice when storage allows it, and applies it either way so the page answers the click. */
export function applyThemePreference(preference: ThemePreference): void {
  try {
    if (preference === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Private windows and blocked storage still switch for this page view; the choice just isn't remembered.
  }
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(preference, window.matchMedia?.(DARK_QUERY).matches ?? false);
  root.dataset.themePreference = preference;
  window.dispatchEvent(new Event(THEME_EVENT));
}
