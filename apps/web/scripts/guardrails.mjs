#!/usr/bin/env node
// The design guardrails from docs/DESIGN.md, run as one script. Prints each hit and exits 1, or prints nothing and exits 0.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const DIRS = ["app", "components", "lib", "content"];
const SOURCE = /\.(tsx?|css|md)$/;

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return SOURCE.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });

const RULES = [
  {
    name: "raw color outside tokens.css",
    // layout.tsx carries the browser chrome colours; app/dev/ is the palette tool, which prints raw values on purpose.
    skip: (file) => file.endsWith("app/tokens.css") || file.endsWith("app/layout.tsx") || file.includes("/app/dev/"),
    test: (line) => /#[0-9a-fA-F]{6}\b|rgba?\(/.test(line),
  },
  { name: "arbitrary color utility", test: (line) => /\b(bg|text|border|ring|outline|fill|stroke)-\[(#|rgb)/.test(line) },
  { name: "banned copy", skip: (file) => file.endsWith(".css"), test: (line) => /seamless|effortless|powerful|escrow|contractor|sandbox|acceptance criterion/i.test(line) },
  {
    // Schibsted Grotesk's tabular figures give periods, commas and colons a digit's width, so "$18.50" reads "$18 . 50".
    name: "tabular-nums on a formatted amount, time or duration (bare integers only)",
    test: (line) => /tabular-nums/.test(line) && /money\(|centsLabel\(|duration\(|clock\(|toFixed\(|toLocale|<time\b|\$\{.*\}\s*[.:,]/.test(line),
  },
];

let hits = 0;
for (const dir of DIRS) {
  for (const file of files(join(root, dir))) {
    const lines = readFileSync(file, "utf8").split("\n");
    for (const rule of RULES) {
      if (rule.skip?.(file)) continue;
      lines.forEach((line, i) => {
        if (!rule.test(line)) return;
        hits++;
        console.log(`${relative(root, file)}:${i + 1}  ${rule.name}\n    ${line.trim().slice(0, 160)}`);
      });
    }
  }
}
process.exit(hits ? 1 : 0);
