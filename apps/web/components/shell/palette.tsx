"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { jumpFor, PLACES, START } from "./nav";
import { applyThemePreference } from "./theme";

interface Action {
  key: string;
  label: string;
  hint: string;
  run: () => void;
}

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * Jump: one box that takes a reviewer's link, a milestone or run id, or a place name. ⌘K, Ctrl K or "/" opens it,
 * and pasting a GitHub issue or pull request link anywhere outside a field opens it with that link ready, because
 * a link in the clipboard is how every milestone starts.
 */
export function Palette() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();

  const close = () => dialog.current?.close();
  const go = (href: string) => {
    close();
    router.push(href);
  };

  useEffect(() => {
    const open = (prefill = "") => {
      setQuery(prefill);
      setActive(0);
      if (!dialog.current?.open) dialog.current?.showModal();
      input.current?.focus();
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else open();
      } else if (event.key === "/" && !isEditable(event.target) && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        open();
      }
    };
    const onPaste = (event: ClipboardEvent) => {
      if (isEditable(event.target) || dialog.current?.open) return;
      const text = event.clipboardData?.getData("text") ?? "";
      if (jumpFor(text)?.kind !== "thread") return;
      event.preventDefault();
      open(text.trim());
    };
    const onOpen = () => open();
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    window.addEventListener("unstuck:jump", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("unstuck:jump", onOpen);
    };
  }, []);

  const jump = jumpFor(query);
  const needle = query.trim().toLowerCase();
  const actions: Action[] = [];
  if (jump?.kind === "thread") {
    actions.push({ key: "thread", label: "Read this comment", hint: shortThread(jump.url), run: () => go(`${START.href}?url=${encodeURIComponent(jump.url)}`) });
  } else if (jump?.kind === "id") {
    actions.push(
      { key: "milestone", label: "Open milestone", hint: jump.id.slice(0, 8), run: () => go(`/m/${jump.id}`) },
      { key: "run", label: "Open run record", hint: jump.id.slice(0, 8), run: () => go(`/runs/${jump.id}`) },
    );
  }
  const places = [START, ...PLACES, { href: "/connect", label: "Connect Agent Market", hint: "Not switched on yet. Sign-in comes with hiring" }];
  for (const place of places) {
    if (!needle || jump || `${place.label} ${place.hint}`.toLowerCase().includes(needle)) {
      if (!jump) actions.push({ key: place.href, label: place.label, hint: place.hint, run: () => go(place.href) });
    }
  }
  if (!jump && (!needle || "theme dark light".includes(needle) || needle.startsWith("th"))) {
    actions.push(
      { key: "light", label: "Light theme", hint: "Concrete and paper", run: () => (applyThemePreference("light"), close()) },
      { key: "dark", label: "Dark theme", hint: "The same list under site lights", run: () => (applyThemePreference("dark"), close()) },
    );
  }
  const current = Math.min(active, Math.max(actions.length - 1, 0));

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current + step + actions.length) % Math.max(actions.length, 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      actions[current]?.run();
    }
  };

  return (
    <dialog
      ref={dialog}
      aria-label="Jump"
      className="sheet fixed inset-x-0 top-[12vh] mx-auto w-[min(36rem,calc(100vw-2rem))]"
      onClick={(event) => event.target === dialog.current && close()}
    >
      <div className="sheet-panel overflow-hidden rounded-sheet border border-border bg-surface shadow-overlay">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <svg aria-hidden viewBox="0 0 20 20" className="size-[18px] shrink-0 text-ink-muted" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="m13 13 4.5 4.5" />
          </svg>
          <input
            ref={input}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={actions[current] ? `${listId}-${actions[current].key}` : undefined}
            aria-label="Paste a reviewer's link, a milestone id, or type a place"
            placeholder="Paste a reviewer's link, or type a place"
            className="min-h-14 w-full min-w-0 bg-transparent text-input outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="kbd">Esc</span>
        </div>
        <ul id={listId} role="listbox" aria-label="Places and actions" className="max-h-[50vh] overflow-y-auto p-2">
          {actions.map((action, i) => (
            <li
              key={action.key}
              id={`${listId}-${action.key}`}
              role="option"
              aria-selected={i === current}
              onClick={action.run}
              onMouseMove={() => setActive(i)}
              className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-control px-3 py-2 aria-selected:bg-surface-muted"
            >
              <span className="min-w-0">
                <span className="block text-body font-semibold">{action.label}</span>
                <span className="block truncate text-small text-ink-secondary">{action.hint}</span>
              </span>
              {i === current && <span className="kbd">↵</span>}
            </li>
          ))}
          {actions.length === 0 && (
            <li className="px-3 py-6 text-small text-ink-secondary">
              Nothing matches. Paste the link to your reviewer&apos;s comment, such as github.com/org/repo/issues/12.
            </li>
          )}
        </ul>
        <p className="hidden border-t border-border px-4 py-2.5 text-small text-ink-muted sm:block">
          Tip: paste a GitHub issue or pull request link anywhere on UNSTUCK to start from it.
        </p>
      </div>
    </dialog>
  );
}

/** The header's opener. From 1280 px, where there's room, it shows its name and the shortcut where a keyboard is likely. */
export function PaletteButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("unstuck:jump"))}
      aria-keyshortcuts="Meta+K Control+K /"
      className={`inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-control border border-border bg-surface px-3 text-small text-ink-secondary transition-colors duration-(--duration-fast) hover:border-border-strong hover:text-ink ${className}`}
    >
      <svg aria-hidden viewBox="0 0 20 20" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="8.5" cy="8.5" r="5.5" />
        <path d="m13 13 4.5 4.5" />
      </svg>
      <span className="max-xl:sr-only">Jump</span>
      <span className="kbd max-xl:hidden">⌘K</span>
    </button>
  );
}

function shortThread(url: string): string {
  const match = url.match(/github\.com\/([\w.-]+\/[\w.-]+)\/(?:issues|pull)\/(\d+)/i);
  return match ? `${match[1]} #${match[2]}` : url;
}
