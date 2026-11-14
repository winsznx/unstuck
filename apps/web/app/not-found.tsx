import { ButtonLink } from "@/components/button";
import { PaletteButton } from "@/components/shell/palette";
import { StatePanel } from "@/components/shell/state-panel";
import { SiteFooter, SiteHeader } from "@/components/site";
import { PunchTag } from "@/components/tag";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-(--container-content) px-2 pt-10 sm:px-6 sm:pt-16">
        <StatePanel
          tag={<PunchTag verdict="unsure">No record here</PunchTag>}
          title="There's no page at this address"
          actions={
            <>
              <ButtonLink href="/start">Start a milestone</ButtonLink>
              <PaletteButton />
            </>
          }
        >
          <p>
            Milestone and run links are permanent, so this one was probably mistyped or cut short. Paste the full link or id into Jump, or start again from
            your reviewer&apos;s comment.
          </p>
        </StatePanel>
      </main>
      <SiteFooter />
    </>
  );
}
