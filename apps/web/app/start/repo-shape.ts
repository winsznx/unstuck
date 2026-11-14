export type RepoKind = "node" | "python" | "rust" | "go" | "unknown";
export type NodeManager = "pnpm" | "yarn" | "npm";

export interface RepoShape {
  kind: RepoKind;
  manager: NodeManager | null;
  managerVersion: string | null;
  scripts: string[];
  readme: string | null;
  docsDir: string | null;
  docsSite: string | null;
  workflows: string[];
  license: string | null;
  dockerfile: boolean;
  examples: string | null;
  fileCount: number;
}

const DOCS_SITE_CONFIGS = ["mkdocs.yml", "docusaurus.config.js", "docusaurus.config.ts", "book.toml", ".vitepress/config.ts", "docs/.vitepress/config.ts"];

export interface PackageJson {
  scripts?: Record<string, string>;
  packageManager?: string;
}

export function shapeOf(paths: readonly string[], pkg: PackageJson | null): RepoShape {
  const files = new Set(paths);
  const top = (name: string) => files.has(name);
  const topDir = (names: string[]) => names.find((n) => paths.some((p) => p.startsWith(`${n}/`))) ?? null;

  const kind: RepoKind = top("package.json")
    ? "node"
    : top("Cargo.toml")
      ? "rust"
      : top("go.mod")
        ? "go"
        : top("pyproject.toml") || top("requirements.txt") || top("setup.py")
          ? "python"
          : "unknown";

  let manager: NodeManager | null = null;
  let managerVersion: string | null = null;
  if (kind === "node") {
    const declared = /^(pnpm|yarn|npm)@(\d+)/.exec(pkg?.packageManager ?? "");
    manager = declared ? (declared[1] as NodeManager) : top("pnpm-lock.yaml") ? "pnpm" : top("yarn.lock") ? "yarn" : "npm";
    managerVersion = declared?.[2] ?? null;
  }

  return {
    kind,
    manager,
    managerVersion,
    scripts: Object.keys(pkg?.scripts ?? {}),
    readme: paths.find((p) => /^readme(\.(md|rst|txt))?$/i.test(p)) ?? null,
    docsDir: topDir(["docs", "doc", "documentation"]),
    docsSite: DOCS_SITE_CONFIGS.find(top) ?? null,
    workflows: paths.filter((p) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(p)),
    license: paths.find((p) => /^(license|licence|copying)(\.(md|txt))?$/i.test(p)) ?? null,
    dockerfile: top("Dockerfile"),
    examples: topDir(["examples", "example", "demo", "demos"]),
    fileCount: paths.length,
  };
}

export function imageFor(shape: RepoShape): string {
  switch (shape.kind) {
    case "node":
      return "node:22-bookworm-slim";
    case "python":
      return "python:3.12-slim";
    case "rust":
      return "rust:1.84-slim";
    case "go":
      return "golang:1.23-bookworm";
    case "unknown":
      return "alpine:3.20";
  }
}

const TOOLS = "/work/.tools/bin";

export function runner(shape: RepoShape): string | null {
  switch (shape.manager) {
    case "pnpm":
      return `${TOOLS}/pnpm`;
    case "yarn":
      return `${TOOLS}/yarn`;
    case "npm":
      return "npm";
    case null:
      return null;
  }
}

export const RUST_ENV = "CARGO_HOME=/work/.cargo";
export const GO_ENV = "GOPATH=/work/.go GOCACHE=/work/.gocache GOFLAGS=-mod=mod";

export interface InstallPlan {
  command: string;
  reason: string;
}

export function installFor(shape: RepoShape): InstallPlan {
  switch (shape.kind) {
    case "node": {
      if (shape.manager === "pnpm") {
        const version = shape.managerVersion ?? "9";
        return {
          command: `npm i -g --prefix /work/.tools pnpm@${version} && ${TOOLS}/pnpm install --frozen-lockfile`,
          reason: `The repo has a pnpm lockfile${shape.managerVersion ? ` and asks for pnpm ${version}` : ""}, so the install uses exactly that lockfile.`,
        };
      }
      if (shape.manager === "yarn") {
        const version = shape.managerVersion ?? "1";
        return {
          command: `npm i -g --prefix /work/.tools yarn@${version} && ${TOOLS}/yarn install --frozen-lockfile`,
          reason: "The repo has a yarn lockfile, so the install uses exactly that lockfile.",
        };
      }
      return { command: "npm ci || npm install", reason: "A Node project. npm ci installs from the lockfile when there is one." };
    }
    case "python":
      return {
        command: "pip install --user -r requirements.txt pytest 2>/dev/null || pip install --user . pytest",
        reason: "A Python project. Packages go into the container's home folder, with pytest for the checks.",
      };
    case "rust":
      return { command: `${RUST_ENV} cargo fetch`, reason: "A Rust project. Crates are downloaded now so the checks can build offline." };
    case "go":
      return { command: `${GO_ENV} go mod download`, reason: "A Go project. Modules are downloaded now so the checks can build offline." };
    case "unknown":
      return { command: "", reason: "No package manager found at the root, so nothing is installed. Checks can still look at files." };
  }
}

export function describeShape(shape: RepoShape): string[] {
  const lines: string[] = [];
  const kindLine: Record<RepoKind, string> = {
    node: `Node project, ${shape.manager}${shape.managerVersion ? ` ${shape.managerVersion}` : ""}`,
    python: "Python project",
    rust: "Rust project",
    go: "Go project",
    unknown: "No package manager at the root",
  };
  lines.push(kindLine[shape.kind]);
  if (shape.scripts.length) lines.push(`Scripts: ${shape.scripts.slice(0, 6).join(", ")}${shape.scripts.length > 6 ? ` and ${shape.scripts.length - 6} more` : ""}`);
  lines.push(shape.docsDir ? `${shape.docsDir}/ folder${shape.docsSite ? `, site config ${shape.docsSite}` : ", no docs site config"}` : "No docs folder");
  lines.push(shape.workflows.length ? `${shape.workflows.length} GitHub ${shape.workflows.length === 1 ? "workflow" : "workflows"}` : "No GitHub workflows");
  if (!shape.readme) lines.push("No README at the root");
  return lines;
}
