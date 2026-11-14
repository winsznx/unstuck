import { describe, expect, it } from "vitest";
import { describeShape, imageFor, installFor, shapeOf } from "./repo-shape";
import { reviewerCommands, suggestionsFor } from "./suggest";

describe("repo shape", () => {
  const paths = ["package.json", "pnpm-lock.yaml", "README.md", "docs/intro.md", ".github/workflows/ci.yml", "src/index.ts"];
  const shape = shapeOf(paths, { scripts: { test: "vitest", build: "tsc" }, packageManager: "pnpm@9.15.0" });

  it("reads the stack, docs and workflows from the tree", () => {
    expect(shape).toMatchObject({ kind: "node", manager: "pnpm", managerVersion: "9", docsDir: "docs", docsSite: null, workflows: [".github/workflows/ci.yml"] });
    expect(imageFor(shape)).toBe("node:22-bookworm-slim");
    expect(installFor(shape).command).toContain("pnpm@9");
    expect(describeShape(shape)).toContain("docs/ folder, no docs site config");
  });

  it("falls back to files only when there is no manifest", () => {
    const bare = shapeOf(["README.md"], null);
    expect(bare.kind).toBe("unknown");
    expect(installFor(bare).command).toBe("");
    expect(imageFor(bare)).toBe("alpine:3.20");
  });

  it("suggests the docs site check for a hosted docs ask", () => {
    const [first] = suggestionsFor("there are many markdown docs files yes but not hosted on one single unified docs page so one can verify", shape, []);
    expect(first?.command).toContain("mkdocs.yml");
  });

  it("suggests the repo's own test script for a test ask, and the reviewer's command first", () => {
    expect(suggestionsFor("Please add unit tests for the transfer path.", shape, [])[0]?.command).toBe("/work/.tools/bin/pnpm run test");
    expect(suggestionsFor("Tests fail.", shape, ["pnpm test:coverage"])[0]).toEqual({ command: "pnpm test:coverage", reason: "Your reviewer wrote this command in the comment." });
  });

  it("finds commands the reviewer wrote in code", () => {
    expect(reviewerCommands("Run this:\n```bash\n$ yarn install\nyarn test\n```\nand `cargo test --all`.")).toEqual(["yarn install", "yarn test", "cargo test --all"]);
  });
});
