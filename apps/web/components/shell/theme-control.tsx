"use client";

import { useSyncExternalStore } from "react";
import { applyThemePreference, readThemePreference, THEME_EVENT, THEME_PREFERENCES, type ThemePreference } from "./theme";

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const useThemePreference = () => useSyncExternalStore(subscribe, readThemePreference, () => "system" as ThemePreference);

/** data-theme changes from the boot script (system setting), this tab and other tabs, so watch the attribute itself. */
function subscribeToShownTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const showsDark = () => document.documentElement.dataset.theme === "dark";
const useShowsDark = () => useSyncExternalStore(subscribeToShownTheme, showsDark, () => false);

const LABEL: Record<ThemePreference, string> = { system: "System", light: "Light", dark: "Dark" };

/**
 * The header's switch. It draws both glyphs and lets data-theme pick one, so the right glyph shows before React
 * knows the theme, and flips between light and dark from whatever is showing now. To assistive tech it's a
 * "Dark theme" toggle that says whether it's on.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const dark = useShowsDark();
  return (
    <button
      type="button"
      onClick={() => applyThemePreference(showsDark() ? "light" : "dark")}
      aria-label="Dark theme"
      aria-pressed={dark}
      title="Switch between light and dark"
      className={`grid size-11 shrink-0 place-items-center rounded-control text-ink-secondary transition-colors duration-(--duration-fast) hover:bg-surface-muted hover:text-ink ${className}`}
    >
      <svg aria-hidden viewBox="0 0 20 20" className="size-[18px] [[data-theme=dark]_&]:hidden" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7Z" strokeLinejoin="round" />
      </svg>
      <svg aria-hidden viewBox="0 0 20 20" className="hidden size-[18px] [[data-theme=dark]_&]:block" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="10" cy="10" r="3.4" />
        <path d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" />
      </svg>
    </button>
  );
}

/** The full choice, with System as the default, for the phone menu. */
export function ThemeChoice() {
  const preference = useThemePreference();
  return (
    <fieldset>
      <legend className="text-small font-semibold">Theme</legend>
      <div className="mt-2 grid grid-cols-3 gap-1 rounded-control border border-border bg-surface-muted p-1">
        {THEME_PREFERENCES.map((value) => (
          <label
            key={value}
            className="flex min-h-10 cursor-pointer items-center justify-center rounded-[4px] text-small font-medium text-ink-secondary has-checked:bg-surface has-checked:text-ink has-checked:shadow-object has-focus-visible:outline-2 has-focus-visible:outline-focus"
          >
            <input type="radio" name="theme" value={value} checked={preference === value} onChange={() => applyThemePreference(value)} className="sr-only" />
            {LABEL[value]}
          </label>
        ))}
      </div>
      <p className="mt-2 text-small text-ink-muted">System follows your device&apos;s light or dark setting.</p>
    </fieldset>
  );
}
