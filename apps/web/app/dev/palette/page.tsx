import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { KitSection } from "../preview/kit";

export const metadata: Metadata = { title: "Palette" };

const GROUPS: { title: string; note: string; match: (token: string) => boolean }[] = [
  { title: "Surfaces", note: "The concrete page, paper panels and the stage behind product scenes.", match: (t) => /^(canvas|surface|stage)/.test(t) },
  { title: "Borders", note: "Hairlines, stronger edges and the border every input carries.", match: (t) => t.startsWith("border") },
  { title: "Ink and action", note: "Graphite text in three weights, the primary button and the focus ring.", match: (t) => /^(ink|action|on-action|focus)/.test(t) },
  { title: "Open", note: "The yellow inspection tag: an item that's still open, with no run deciding it.", match: (t) => t.startsWith("open") || t === "on-open" },
  { title: "Still missing", note: "Only shown when a stored run failed.", match: (t) => t.startsWith("fails") },
  { title: "Works", note: "Only shown when a stored run passed.", match: (t) => t.startsWith("passes") || t === "on-state" },
  { title: "Not sure", note: "Dashed and grey: nothing decided it.", match: (t) => t.startsWith("unsure") },
  { title: "Log", note: "Machine output only.", match: (t) => t.startsWith("log") },
];

const colorsIn = (block: string): Record<string, string> =>
  Object.fromEntries([...block.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1] ?? "", (m[2] ?? "").toLowerCase()]));

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Reads tokens.css on every request, so the page always shows the values the app is using. */
async function loadThemes() {
  const css = await readFile(path.join(process.cwd(), "app/tokens.css"), "utf8");
  const darkAt = css.indexOf(':root[data-theme="dark"]');
  const light = colorsIn(darkAt < 0 ? css : css.slice(0, darkAt));
  const dark = { ...light, ...(darkAt < 0 ? {} : colorsIn(css.slice(darkAt))) };
  return { light, dark };
}

export default async function PalettePage() {
  const { light, dark } = await loadThemes();
  const tokens = Object.keys(light);
  const grouped = GROUPS.map((g) => ({ ...g, tokens: tokens.filter(g.match) }));
  const other = tokens.filter((t) => !GROUPS.some((g) => g.match(t)));

  return (
    <main className="mx-auto max-w-(--container-content) px-4 py-12 sm:px-6">
      <p className="text-small text-ink-muted">
        <Link className="underline underline-offset-4" href="/dev/preview">
          Component preview
        </Link>
      </p>
      <h1 className="mt-2 text-display font-semibold">Palette</h1>
      <p className="mt-4 max-w-[44rem] text-lead text-ink-secondary">
        Every colour token in tokens.css, light and night side by side. The ratio is each colour against the panel surface of its theme. The pairs the design depends on are checked by <code className="font-mono log-type">pnpm --filter @unstuck/web contrast</code>.
      </p>
      <div className="mt-12">
        {[...grouped, { title: "Other", note: "Tokens outside the groups above.", tokens: other }]
          .filter((g) => g.tokens.length > 0)
          .map((group) => (
            <KitSection key={group.title} id={group.title.toLowerCase().replace(/\s+/g, "-")} title={group.title} description={group.note}>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.tokens.map((token) => (
                  <li key={token} className="overflow-hidden rounded-panel border border-border bg-surface">
                    <div className="grid h-20 grid-cols-2">
                      <Swatch hex={light[token] ?? "#000000"} surface={light.surface ?? "#ffffff"} />
                      <Swatch hex={dark[token] ?? "#000000"} surface={dark.surface ?? "#000000"} />
                    </div>
                    <p className="border-t border-border px-3 py-2 font-mono log-type">{token}</p>
                  </li>
                ))}
              </ul>
            </KitSection>
          ))}
      </div>
    </main>
  );
}

function Swatch({ hex, surface }: { hex: string; surface: string }) {
  const ratio = contrast(hex, surface);
  const label = luminance(hex) > 0.35 ? "#1d2226" : "#ffffff";
  return (
    <div className="flex flex-col justify-end p-2.5 font-mono text-tag" style={{ backgroundColor: hex, color: label }}>
      <span>{hex}</span>
      <span className="opacity-80">{ratio.toFixed(2)} on panel</span>
    </div>
  );
}
