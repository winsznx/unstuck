import { GO_ENV, runner, RUST_ENV, type RepoShape } from "./repo-shape";

export interface Suggestion {
  command: string;
  reason: string;
}

const fail = (message: string) => `{ echo '${message.replace(/'/g, "")}'; exit 1; }`;

function scriptCommand(shape: RepoShape, names: string[]): { command: string; script: string } | null {
  const run = runner(shape);
  const script = names.find((n) => shape.scripts.includes(n));
  return run && script ? { command: `${run} run ${script}`, script } : null;
}

function testCommand(shape: RepoShape): Suggestion | null {
  switch (shape.kind) {
    case "node": {
      const found = scriptCommand(shape, ["test", "test:unit"]);
      return found ? { command: found.command, reason: `Runs the repo's own "${found.script}" script, the way your reviewer would.` } : null;
    }
    case "python":
      return { command: "python -m pytest -q", reason: "Runs the Python test suite with pytest." };
    case "rust":
      return { command: `${RUST_ENV} cargo test --offline`, reason: "Runs the Rust tests, offline, against the crates fetched at install." };
    case "go":
      return { command: `${GO_ENV} go test ./...`, reason: "Runs every Go package's tests." };
    case "unknown":
      return null;
  }
}

function buildCommand(shape: RepoShape): Suggestion | null {
  switch (shape.kind) {
    case "node": {
      const found = scriptCommand(shape, ["build", "compile", "typecheck"]);
      return found ? { command: found.command, reason: `Runs the repo's "${found.script}" script. A clean exit means it builds.` } : null;
    }
    case "rust":
      return { command: `${RUST_ENV} cargo build --offline`, reason: "Builds the crate offline." };
    case "go":
      return { command: `${GO_ENV} go build ./...`, reason: "Builds every Go package." };
    case "python":
      return { command: "python -m compileall -q .", reason: "Compiles every Python file, which catches syntax and import-time errors." };
    case "unknown":
      return null;
  }
}

const DOCS_SITE = `ls mkdocs.yml docusaurus.config.js docusaurus.config.ts book.toml .vitepress/config.ts docs/.vitepress/config.ts 2>/dev/null | grep . || ${fail("error: no docs site config found (mkdocs, docusaurus, mdbook, vitepress)")}`;
const DOCS_DEPLOY = `grep -rEl 'gh-pages|deploy-pages|mkdocs gh-deploy|docusaurus deploy' .github 2>/dev/null | grep . || ${fail("error: no docs deploy workflow in .github")}`;

interface Rule {
  test: RegExp;
  suggest: (shape: RepoShape) => Suggestion | null;
}

const RULES: Rule[] = [
  {
    test: /\b(docs?|documentation)\b.*\b(site|page|hosted|host|unified|portal)\b|\b(hosted|unified|single)\b.*\b(docs?|documentation)\b/i,
    suggest: () => ({ command: DOCS_SITE, reason: "A hosted docs page starts with a site config in the repo. This fails when there isn't one." }),
  },
  {
    test: /\b(publish|deploy|deployed|live|github pages)\b.*\b(docs?|documentation|site)\b|\b(docs?|documentation)\b.*\b(publish|deploy|deployed)\b/i,
    suggest: () => ({ command: DOCS_DEPLOY, reason: "Published docs need a workflow that deploys them. This looks for one in .github." }),
  },
  {
    test: /\b(tests?|testing|coverage|unit|spec|specs)\b/i,
    suggest: testCommand,
  },
  {
    test: /\b(build|builds|compile|compiles|cannot find module|can't find module|error|errors|fails?|failing|broken|crash|install)\b/i,
    suggest: (shape) => buildCommand(shape) ?? testCommand(shape),
  },
  {
    test: /\b(lint|linting|format|formatting|clippy|eslint)\b/i,
    suggest: (shape) => {
      if (shape.kind === "rust") return { command: `${RUST_ENV} cargo clippy --offline -- -D warnings`, reason: "Runs clippy and treats warnings as failures." };
      const found = scriptCommand(shape, ["lint", "format:check", "fmt:check"]);
      return found ? { command: found.command, reason: `Runs the repo's "${found.script}" script.` } : null;
    },
  },
  {
    test: /\b(readme|instructions|how to run|setup guide|getting started)\b/i,
    suggest: () => ({
      command: `test -s README.md || ${fail("error: README.md is missing or empty")}; grep -qiE 'install|usage|getting started' README.md || ${fail("error: README.md has no install or usage section")}`,
      reason: "Checks the README exists and has an install or usage section.",
    }),
  },
  {
    test: /\b(docs?|documentation|guide|guides)\b/i,
    suggest: () => ({ command: `ls docs/*.md 2>/dev/null | grep . || ${fail("error: no markdown docs in docs/")}`, reason: "Checks the repo has written docs in a docs folder." }),
  },
  {
    test: /\b(ci|workflow|workflows|github actions|pipeline)\b/i,
    suggest: () => ({ command: `ls .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null | grep . || ${fail("error: no GitHub workflows")}`, reason: "Checks the repo has a CI workflow." }),
  },
  {
    test: /\b(licen[cs]e)\b/i,
    suggest: () => ({ command: `ls LICENSE* LICENCE* COPYING* 2>/dev/null | grep . || ${fail("error: no license file")}`, reason: "Checks for a license file at the root." }),
  },
  {
    test: /\b(docker|dockerfile|container|image)\b/i,
    suggest: () => ({ command: `test -f Dockerfile || ${fail("error: no Dockerfile at the root")}`, reason: "Checks for a Dockerfile at the root." }),
  },
  {
    test: /\b(examples?|demo|demos|tutorial|sample)\b/i,
    suggest: () => ({ command: `ls -d examples example demo demos 2>/dev/null | grep . || ${fail("error: no examples folder")}`, reason: "Checks the repo ships an examples or demo folder." }),
  },
];

const COMMAND_START = /^(?:\$\s*)?((?:npm|npx|pnpm|yarn|bun|cargo|go|python3?|pytest|make|forge|anchor|just|\.\/)\S*\s.*|(?:npm|pnpm|yarn|make|pytest)\b.*)$/;

export function reviewerCommands(body: string): string[] {
  const commands = new Set<string>();
  const fenced = body.matchAll(/```[^\n]*\n([\s\S]*?)```/g);
  for (const block of fenced) {
    for (const line of (block[1] ?? "").split("\n")) {
      const match = COMMAND_START.exec(line.trim());
      if (match?.[1]) commands.add(match[1].trim());
    }
  }
  for (const inline of body.matchAll(/`([^`\n]+)`/g)) {
    const match = COMMAND_START.exec((inline[1] ?? "").trim());
    if (match?.[1]) commands.add(match[1].trim());
  }
  return [...commands].slice(0, 6);
}

export function suggestionsFor(ask: string, shape: RepoShape | null, fromReviewer: readonly string[]): Suggestion[] {
  const out: Suggestion[] = [];
  const seen = new Set<string>();
  const add = (s: Suggestion | null) => {
    if (s && !seen.has(s.command)) {
      seen.add(s.command);
      out.push(s);
    }
  };
  for (const command of fromReviewer) add({ command, reason: "Your reviewer wrote this command in the comment." });
  for (const rule of RULES) {
    if (rule.test.test(ask) && shape) add(rule.suggest(shape));
  }
  if (out.length === 0 && shape) add(testCommand(shape));
  return out.slice(0, 3);
}
