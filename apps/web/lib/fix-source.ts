/** Where a fix to check lives: a commit in the reviewed repo's network, or a pull request against it. */
export type FixSource = { kind: "commit"; sha: string } | { kind: "pull"; owner: string; repo: string; number: number };

const SHA = /^[0-9a-f]{7,40}$/i;
const COMMIT_URL = /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)\/(?:commit|pull\/\d+\/commits)\/([0-9a-f]{7,40})\b/i;
const PULL_URL = /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)\b/i;

/** Reads a pasted SHA, commit link or pull request link. Anything else is null, with the reason left to the caller. */
export function parseFixSource(input: string): FixSource | null {
  const value = input.trim();
  if (SHA.test(value)) return { kind: "commit", sha: value.toLowerCase() };
  const commit = COMMIT_URL.exec(value);
  if (commit?.[3]) return { kind: "commit", sha: commit[3].toLowerCase() };
  const pull = PULL_URL.exec(value);
  if (pull?.[1] && pull[2] && pull[3]) return { kind: "pull", owner: pull[1], repo: pull[2], number: Number(pull[3]) };
  return null;
}

/** GitHub's diff from the reviewed commit to the fix. Forks share the base repo's network, so their commits resolve too. */
export const compareDiffUrl = (codeRepoUrl: string, baseSha: string, fixSha: string): string =>
  `${codeRepoUrl.replace(/\/$/, "")}/compare/${baseSha}...${fixSha}.diff`;

/** Big enough for any real milestone fix, small enough to keep one row reasonable. */
export const MAX_PATCH_BYTES = 1_500_000;
