import "server-only";
import { z } from "zod";
import { GitHubClient } from "@unstuck/integrations/github";
import { shapeOf, type PackageJson, type RepoShape } from "./repo-shape";

const TTL_MS = 5 * 60_000;
const API = "https://api.github.com";

interface Cached {
  at: number;
  status: number;
  headers: [string, string][];
  body: string;
}

const store = ((globalThis as { __unstuckGithubCache?: Map<string, Cached> }).__unstuckGithubCache ??= new Map());

/**
 * Onboarding reads the same thread several times while someone moves back and forth between steps. Unauthenticated
 * GitHub allows 60 reads an hour, so successful GETs are kept for five minutes. Saving a milestone never uses this.
 */
const cachedFetch: typeof fetch = async (input, init) => {
  const key = String(input);
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return new Response(hit.body, { status: hit.status, headers: hit.headers });
  const response = await fetch(input, init);
  if (!response.ok) return response;
  const body = await response.text();
  const headers = [...response.headers.entries()];
  store.set(key, { at: Date.now(), status: response.status, headers, body });
  return new Response(body, { status: response.status, headers });
};

const token = () => process.env.GITHUB_TOKEN || undefined;

export function github({ fresh = false }: { fresh?: boolean } = {}): GitHubClient {
  const t = token();
  return new GitHubClient({ ...(t ? { token: t } : {}), ...(fresh ? {} : { fetch: cachedFetch }) });
}

async function getJson(url: string): Promise<unknown> {
  const headers: Record<string, string> = { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "unstuck" };
  const t = token();
  if (t) headers.authorization = `Bearer ${t}`;
  const response = await cachedFetch(url, { headers });
  if (!response.ok) throw new Error(`GitHub ${response.status} for ${url}${response.headers.get("x-ratelimit-remaining") === "0" ? " (rate limited)" : ""}`);
  return response.json();
}

const commitList = z.array(
  z.object({
    sha: z.string(),
    commit: z.object({ message: z.string(), committer: z.object({ date: z.string() }).nullable(), author: z.object({ name: z.string() }).nullable() }),
  }),
);
const tree = z.object({ tree: z.array(z.object({ path: z.string(), type: z.string() })), truncated: z.boolean() });
const packageJson = z.object({ scripts: z.record(z.string(), z.string()).optional(), packageManager: z.string().optional() });

export interface CommitRead {
  sha: string;
  message: string;
  committedAt: string;
  author: string | null;
}

export interface CodeRead {
  repoUrl: string;
  commit: CommitRead;
  shape: RepoShape;
}

export async function commitBefore(owner: string, repo: string, at: string, from?: string): Promise<CommitRead | null> {
  const params = new URLSearchParams({ until: at, per_page: "1" });
  if (from) params.set("sha", from);
  const [first] = commitList.parse(await getJson(`${API}/repos/${owner}/${repo}/commits?${params}`));
  if (!first) return null;
  return {
    sha: first.sha,
    message: first.commit.message.split("\n")[0] ?? "",
    committedAt: first.commit.committer?.date ?? at,
    author: first.commit.author?.name ?? null,
  };
}

export async function shapeAt(owner: string, repo: string, sha: string): Promise<RepoShape> {
  const listing = tree.parse(await getJson(`${API}/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`));
  const paths = listing.tree.filter((e) => e.type === "blob" || e.type === "tree").map((e) => e.path);
  let pkg: PackageJson | null = null;
  if (paths.includes("package.json")) {
    try {
      const raw = await cachedFetch(`https://raw.githubusercontent.com/${owner}/${repo}/${sha}/package.json`);
      if (raw.ok) {
        const parsed = packageJson.safeParse(await raw.json());
        if (parsed.success) pkg = { ...(parsed.data.scripts ? { scripts: parsed.data.scripts } : {}), ...(parsed.data.packageManager ? { packageManager: parsed.data.packageManager } : {}) };
      }
    } catch (error) {
      console.warn("package.json read failed", owner, repo, sha, error);
    }
  }
  return shapeOf(paths, pkg);
}
