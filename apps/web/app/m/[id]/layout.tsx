import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { MilestoneRail } from "@/components/fix/part-rail";
import { RememberMilestone } from "@/components/fix/remember";
import { SiteFooter, SiteHeader } from "@/components/site";
import { isJobStatus, partsFor } from "@/lib/fix";
import { day, repoName, sha7 } from "@/lib/format";
import { programOf } from "@/lib/programs";
import { jobsFor, milestoneView } from "@/lib/queries";
import { PRIVATE_PAGE } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** Every page under a milestone belongs to the grantee who started it. Its run records are the public part. */
export const metadata: Metadata = { robots: PRIVATE_PAGE };

export default async function MilestoneLayout({ params, children }: { params: Promise<{ id: string }>; children: ReactNode }) {
  const { id } = await params;
  const [view, jobs] = await Promise.all([milestoneView(id), jobsFor(id)]);
  if (!view) notFound();
  const { milestone } = view;
  const latestJob = jobs[0] && isJobStatus(jobs[0].status) ? jobs[0].status : null;

  return (
    <>
      <SiteHeader />
      <div className="min-w-0">
      <RememberMilestone id={milestone.id} />
      <div className="mx-auto max-w-(--container-content) px-4 pt-6 sm:px-6">
        <p className="flex flex-wrap items-center gap-x-2 text-small text-ink-secondary">
          <Link className="underline-offset-4 hover:text-ink hover:underline" href="/m">
            Milestones
          </Link>
          <span aria-hidden="true" className="text-ink-muted">
            /
          </span>
          <a className="underline-offset-4 hover:text-ink hover:underline" href={milestone.threadUrl}>
            {programOf(milestone.threadRepo)}, {threadRef(milestone.threadUrl)}
          </a>
        </p>
        <p className="mt-2 max-w-4xl text-h1 font-semibold text-balance wrap-anywhere">{milestone.threadTitle ?? `Milestone on ${repoName(milestone.codeRepoUrl)}`}</p>
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-small text-ink-secondary">
          <span>
            Reviewed by <span className="font-medium text-ink">{milestone.reviewerLogin ?? "unknown"}</span>
            {milestone.reviewerCommentAt ? ` on ${day(milestone.reviewerCommentAt)}` : ""}
          </span>
          <span>
            Code: {repoName(milestone.codeRepoUrl)} at{" "}
            <span className="font-mono text-ink" title={milestone.pinnedSha ?? undefined}>
              {sha7(milestone.pinnedSha)}
            </span>
          </span>
        </p>
        <div className="mt-6">
          <MilestoneRail parts={partsFor(view, latestJob)} />
        </div>
      </div>
      {children}
      </div>
      <SiteFooter />
    </>
  );
}

function threadRef(url: string): string {
  const m = url.match(/\/(issues|pull)\/(\d+)/);
  return m ? `#${m[2]}` : "thread";
}
