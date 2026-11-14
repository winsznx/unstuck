import "server-only";
import { z } from "zod";
import { enqueue, replays } from "@unstuck/db";
import { db } from "@/lib/db";
import { compareDiffUrl, MAX_PATCH_BYTES, parseFixSource } from "@/lib/fix-source";
import { milestoneView } from "@/lib/queries";

const REPO = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i;

function githubHeaders(accept: string): Record<string, string> {
  const headers: Record<string, string> = { accept, "user-agent": "unstuck", "x-github-api-version": "2022-11-28" };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

const pullHead = z.object({ head: z.object({ sha: z.string() }), base: z.object({ repo: z.object({ full_name: z.string() }) }) });

/** The head commit of a pull request against the reviewed repo, or the reason it can't be used. */
async function pullHeadSha(owner: string, repo: string, number: number, codeRepo: string): Promise<{ sha: string } | { ok: false; error: string }> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`, { headers: githubHeaders("application/vnd.github+json") });
  if (response.status === 404) return { ok: false, error: "UNSTUCK couldn't open that pull request. Check the link. Private repos aren't supported yet." };
  if (!response.ok) return { ok: false, error: "GitHub didn't answer while reading that pull request. Try again in a minute." };
  const pull = pullHead.parse(await response.json());
  if (pull.base.repo.full_name.toLowerCase() !== codeRepo.toLowerCase()) {
    return { ok: false, error: `That pull request goes into ${pull.base.repo.full_name}, not ${codeRepo}, the repo your reviewer looked at.` };
  }
  return { sha: pull.head.sha };
}

/**
 * Reruns the base run's exact steps, image and network settings on the reviewed commit with the fix applied as a
 * patch. The patch is GitHub's diff from the reviewed commit to the fix, so the rerun checks exactly what changed.
 */
export type FixCheck = { ok: true; replayId: string } | { ok: false; error: string };

export async function startFixCheck(milestoneId: string, fixInput: string): Promise<FixCheck> {
  const view = await milestoneView(milestoneId);
  if (!view) return { ok: false, error: "This milestone doesn't exist." };
  const base = view.base?.replay;
  if (!base || base.status !== "finished") return { ok: false, error: "The first run on the reviewed commit has to finish before a fix can be checked against it." };
  const repoUrl = view.milestone.codeRepoUrl;
  const repoMatch = repoUrl ? REPO.exec(repoUrl) : null;
  if (!repoUrl || !repoMatch?.[1] || !repoMatch[2]) return { ok: false, error: "This milestone's repo address can't be read." };
  const codeRepo = `${repoMatch[1]}/${repoMatch[2]}`;

  const source = parseFixSource(fixInput);
  if (!source) return { ok: false, error: "Paste a pull request link, a commit link or a commit SHA from GitHub." };

  let fixSha: string;
  if (source.kind === "pull") {
    const head = await pullHeadSha(source.owner, source.repo, source.number, codeRepo);
    if ("error" in head) return { ok: false, error: head.error };
    fixSha = head.sha;
  } else {
    fixSha = source.sha;
  }
  if (base.sha.startsWith(fixSha) || fixSha.startsWith(base.sha)) {
    return { ok: false, error: "That's the commit your reviewer saw. Paste the commit or pull request with your fix." };
  }

  const diffResponse = await fetch(compareDiffUrl(repoUrl, base.sha, fixSha), { headers: githubHeaders("text/plain") });
  if (diffResponse.status === 404) return { ok: false, error: `GitHub can't compare that commit with the reviewed one. It has to be in ${codeRepo} or one of its forks.` };
  if (!diffResponse.ok) return { ok: false, error: "GitHub didn't answer while building the diff. Try again in a minute." };
  const patch = await diffResponse.text();
  if (!patch.trim()) return { ok: false, error: "There's no difference between that commit and the one your reviewer saw." };
  if (Buffer.byteLength(patch) > MAX_PATCH_BYTES) return { ok: false, error: "That change is larger than 1.5 MB of diff. Check a smaller commit or pull request." };

  const running = view.patches.find((p) => p.replay.patch === patch && (p.replay.status === "queued" || p.replay.status === "running"));
  if (running) return { ok: true, replayId: running.replay.id };
  const replayId = await db().transaction(async (tx) => {
    const [replay] = await tx
      .insert(replays)
      .values({ milestoneId, target: "patch", sha: base.sha, image: base.image, steps: base.steps, patch })
      .returning({ id: replays.id });
    if (!replay) throw new Error("patch replay insert returned no row");
    await enqueue(tx, "replay", { replayId: replay.id }, { dedupeKey: `replay:${replay.id}` });
    return replay.id;
  });
  return { ok: true, replayId };
}
