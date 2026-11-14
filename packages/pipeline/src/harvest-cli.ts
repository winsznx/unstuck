import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { GitHubClient, parseThreadUrl, type Thread } from "@unstuck/integrations/github";
import { SOURCES, assess, learnReviewers, listOpen, type Candidate } from "./harvest";

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { out: { type: "string" }, limit: { type: "string", default: "80" } } });
  const token = process.env.GITHUB_TOKEN;
  const github = new GitHubClient(token ? { token } : {});
  const now = new Date();
  const candidates: Candidate[] = [];
  let scanned = 0;

  for (const source of SOURCES) {
    const threads: Thread[] = [];
    for (const url of await listOpen(token, source, Number(values.limit))) {
      try {
        threads.push(await github.fetchThread(parseThreadUrl(url)));
      } catch (error) {
        console.error(`skip ${url}: ${String(error)}`);
      }
    }
    scanned += threads.length;
    const reviewers = new Set([...learnReviewers(threads), ...(source.knownReviewers ?? [])]);
    console.error(`${source.program}: ${threads.length} open threads, reviewers: ${[...reviewers].join(", ") || "none learned"}`);
    for (const thread of threads) {
      const candidate = assess(source.program, thread, reviewers, now);
      if (candidate) candidates.push(candidate);
    }
  }

  candidates.sort((a, b) => Number(a.granteeRepliedAfter) - Number(b.granteeRepliedAfter) || a.daysSinceReview - b.daysSinceReview);
  const report = { harvestedAt: now.toISOString(), scanned, candidates };
  if (values.out) await writeFile(values.out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`${candidates.length} candidates from ${scanned} open threads`);
  for (const c of candidates) {
    console.log(`${c.granteeRepliedAfter ? "  " : "* "}${c.voteFailed ? "VOTE-FAILED " : ""}${c.daysSinceReview}d ${c.program} ${c.url} [${c.signals.join(",")}] repos=${c.codeRepos.length}`);
  }
}

await main();
