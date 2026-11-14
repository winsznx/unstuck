#!/usr/bin/env node
// Reads the color tokens from app/tokens.css and checks every pairing docs/DESIGN.md relies on, in both themes.
// The dark theme is the light tokens with the :root[data-theme="dark"] block laid over them.
// Exit 0 when every pair passes, 1 on any failure, 2 when a token is missing.
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/tokens.css", import.meta.url), "utf8");
const colorsIn = (block) => Object.fromEntries([...block.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
const darkStart = css.indexOf(':root[data-theme="dark"]');
if (darkStart < 0) {
  console.error("missing the dark theme block");
  process.exit(2);
}
const light = colorsIn(css.slice(0, darkStart));
const THEMES = { light, dark: { ...light, ...colorsIn(css.slice(darkStart)) } };

const PAIRS = [
  ["ink", "canvas", 4.5, "body text on the page"],
  ["ink", "surface", 4.5, "body text on panels"],
  ["ink", "surface-muted", 4.5, "body text on muted panels"],
  ["ink-secondary", "canvas", 4.5, "secondary text on the page"],
  ["ink-secondary", "surface", 4.5, "secondary text on panels"],
  ["ink-secondary", "surface-muted", 4.5, "secondary text on muted panels"],
  ["ink-muted", "surface", 4.5, "meta text on panels"],
  ["ink-muted", "canvas", 4.5, "meta text on the page"],
  ["on-action", "action", 4.5, "primary button label"],
  ["on-open", "open", 4.5, "label on the open tag"],
  ["ink", "open-soft", 4.5, "reviewer quote on the open highlight"],
  ["ink", "passes-soft", 4.5, "reviewer quote on the passed highlight"],
  ["ink", "fails-soft", 4.5, "text on the fails wash"],
  ["on-state", "fails", 4.5, "label on the fails tag"],
  ["on-state", "passes", 4.5, "label on the passes tag"],
  ["fails-text", "surface", 4.5, "fails words on panels"],
  ["fails-text", "fails-soft", 4.5, "fails words on the fails wash"],
  ["passes-text", "surface", 4.5, "passes words on panels"],
  ["passes-text", "passes-soft", 4.5, "passes words on the passes wash"],
  ["ink-secondary", "unsure-soft", 4.5, "label on the not-sure tag"],
  ["ink", "open-mark", 4.5, "reviewer quote on the open highlighter stroke"],
  ["ink", "fails-mark", 4.5, "reviewer quote on the still-missing stroke"],
  ["ink", "passes-mark", 4.5, "reviewer quote on the works stroke"],
  ["ink", "stage", 4.5, "text on the concrete stage"],
  ["ink-secondary", "stage", 4.5, "secondary text on the concrete stage"],
  ["ink-secondary", "stage-line", 4.5, "secondary text where it crosses the stage grid"],
  ["log-ink", "log", 4.5, "log text"],
  ["log-muted", "log", 4.5, "log meta text"],
  ["open", "log", 3, "focus ring on the graphite band"],
  ["on-open", "log-strong", 4.5, "inverse button and section pin on the graphite band"],
  ["log-fail", "log", 4.5, "failing log line"],
  ["log-pass", "log", 4.5, "passing log line"],
  ["border-control", "surface", 3, "input boundary"],
  ["focus", "surface", 3, "focus ring on panels"],
  ["focus", "canvas", 3, "focus ring on the page"],
  ["open", "surface", 1.4, "open tag edge, carried by its ink border"],
  ["log-strong", "log", 4.5, "headings on the graphite band"],
  ["on-action", "ink", 4.5, "initials and active navigation tag"],
  ["ink-secondary", "open-soft", 4.5, "secondary text on the open wash"],
];

const channel = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

let failed = 0;
const missing = new Set(PAIRS.flatMap(([f, b]) => [f, b]).filter((t) => !light[t]));
if (missing.size) {
  console.error(`missing tokens: ${[...missing].join(", ")}`);
  process.exit(2);
}
console.log("| Theme | Foreground | Background | Ratio | Needs | Use | Result |\n| --- | --- | --- | --- | --- | --- | --- |");
for (const [theme, tokens] of Object.entries(THEMES)) {
  for (const [fg, bg, need, use] of PAIRS) {
    const ratio = contrast(tokens[fg], tokens[bg]);
    const pass = ratio >= need;
    if (!pass) failed++;
    console.log(`| ${theme} | ${fg} | ${bg} | ${(Math.floor(ratio * 100) / 100).toFixed(2)} | ${need} | ${use} | ${pass ? "pass" : "FAIL"} |`);
  }
}
process.exit(failed ? 1 : 0);
