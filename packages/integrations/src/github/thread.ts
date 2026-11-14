import { z } from "zod";

export interface ThreadRef {
  owner: string;
  repo: string;
  number: number;
  kind: "issue" | "pull";
}

export interface ThreadComment {
  id: string;
  kind: "issue_comment" | "review" | "review_comment";
  author: string;
  authorAssociation: string;
  body: string;
  createdAt: string;
  url: string;
}

export interface Thread {
  ref: ThreadRef;
  title: string;
  body: string;
  author: string;
  state: string;
  url: string;
  headSha: string | null;
  comments: ThreadComment[];
}

export interface GitHubOptions {
  token?: string;
  fetch?: typeof fetch;
  apiBase?: string;
}

const THREAD_URL =
  /^https:\/\/github\.com\/(?<owner>[A-Za-z0-9-]{1,39})\/(?<repo>[A-Za-z0-9._-]{1,100})\/(?<kind>issues|pull)\/(?<number>\d+)\/?(?:[#?].*)?$/;

export function parseThreadUrl(url: string): ThreadRef {
  const groups = THREAD_URL.exec(url.trim())?.groups;
  if (!groups?.owner || !groups.repo || !groups.number) throw new Error(`not a GitHub issue or pull request url: ${url}`);
  return { owner: groups.owner, repo: groups.repo, number: Number(groups.number), kind: groups.kind === "pull" ? "pull" : "issue" };
}

const user = z.object({ login: z.string() }).nullable();
const issue = z.object({
  title: z.string(),
  body: z.string().nullable(),
  user,
  state: z.string(),
  html_url: z.string(),
  pull_request: z.unknown().optional(),
});
const issueComment = z.object({
  id: z.number(),
  user,
  author_association: z.string(),
  body: z.string().nullable(),
  created_at: z.string(),
  html_url: z.string(),
});
const review = z.object({
  id: z.number(),
  user,
  author_association: z.string(),
  body: z.string().nullable(),
  submitted_at: z.string().nullable(),
  html_url: z.string(),
  state: z.string(),
});
const pull = z.object({ head: z.object({ sha: z.string() }) });
const commit = z.object({ sha: z.string() });

export class GitHubClient {
  readonly #token: string | undefined;
  readonly #fetch: typeof fetch;
  readonly #api: string;

  constructor(options: GitHubOptions = {}) {
    this.#token = options.token;
    this.#fetch = options.fetch ?? fetch;
    this.#api = options.apiBase ?? "https://api.github.com";
  }

  async fetchThread(ref: ThreadRef): Promise<Thread> {
    const base = `/repos/${ref.owner}/${ref.repo}`;
    const head = issue.parse(await this.#get(`${base}/issues/${ref.number}`));
    const isPull = head.pull_request !== undefined;

    const comments: ThreadComment[] = (await this.#all(`${base}/issues/${ref.number}/comments`, issueComment)).map((c) => ({
      id: `ic_${c.id}`,
      kind: "issue_comment",
      author: c.user?.login ?? "ghost",
      authorAssociation: c.author_association,
      body: c.body ?? "",
      createdAt: c.created_at,
      url: c.html_url,
    }));

    let headSha: string | null = null;
    if (isPull) {
      headSha = pull.parse(await this.#get(`${base}/pulls/${ref.number}`)).head.sha;
      for (const r of await this.#all(`${base}/pulls/${ref.number}/reviews`, review)) {
        if (!r.body || r.submitted_at === null) continue;
        comments.push({
          id: `rv_${r.id}`,
          kind: "review",
          author: r.user?.login ?? "ghost",
          authorAssociation: r.author_association,
          body: r.body,
          createdAt: r.submitted_at,
          url: r.html_url,
        });
      }
      for (const c of await this.#all(`${base}/pulls/${ref.number}/comments`, issueComment)) {
        comments.push({
          id: `rc_${c.id}`,
          kind: "review_comment",
          author: c.user?.login ?? "ghost",
          authorAssociation: c.author_association,
          body: c.body ?? "",
          createdAt: c.created_at,
          url: c.html_url,
        });
      }
    }

    comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return {
      ref: { ...ref, kind: isPull ? "pull" : "issue" },
      title: head.title,
      body: head.body ?? "",
      author: head.user?.login ?? "ghost",
      state: head.state,
      url: head.html_url,
      headSha,
      comments,
    };
  }

  async shaAt(owner: string, repo: string, isoDate: string, branch?: string): Promise<string | null> {
    const params = new URLSearchParams({ until: isoDate, per_page: "1" });
    if (branch) params.set("sha", branch);
    const commits = z.array(commit).parse(await this.#get(`/repos/${owner}/${repo}/commits?${params}`));
    return commits[0]?.sha ?? null;
  }

  async #all<T>(path: string, schema: z.ZodType<T>): Promise<T[]> {
    const items: T[] = [];
    let next: string | null = `${this.#api}${path}${path.includes("?") ? "&" : "?"}per_page=100`;
    for (let page = 0; next && page < 20; page++) {
      const response = await this.#request(next);
      items.push(...z.array(schema).parse(await response.json()));
      next = nextLink(response.headers.get("link"));
    }
    return items;
  }

  async #get(path: string): Promise<unknown> {
    return (await this.#request(`${this.#api}${path}`)).json();
  }

  async #request(url: string): Promise<Response> {
    const headers: Record<string, string> = {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "unstuck",
    };
    if (this.#token) headers.authorization = `Bearer ${this.#token}`;
    const response = await this.#fetch(url, { headers });
    if (!response.ok) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      throw new Error(`GitHub ${response.status} for ${url}${remaining === "0" ? " (rate limited, set GITHUB_TOKEN)" : ""}`);
    }
    return response;
  }
}

function nextLink(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const match = /<([^>]+)>;\s*rel="next"/.exec(part);
    if (match?.[1]) return match[1];
  }
  return null;
}
