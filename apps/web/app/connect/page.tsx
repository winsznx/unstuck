import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site";
import { CONNECT_STEPS, type ConnectStep } from "./connect-state";
import { ConnectFlow } from "./connect-flow";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = { title: "Connect Agent Market", robots: PRIVATE_PAGE };

const isStep = (value: string | undefined): value is ConnectStep => CONNECT_STEPS.some((step) => step === value);

export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { step } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-(--container-content) px-4 pt-4 pb-16 sm:px-6 sm:pt-8">
        <h1 className="text-display font-semibold">Connect Agent Market</h1>
        <p className="mt-3 max-w-(--container-reading) text-lead text-ink-secondary">
          Two minutes, once. After this, UNSTUCK can hire an agent on NEAR Agent Market to build what your reviewer asked for, inside a limit you set.
        </p>
        <ConnectFlow initialStep={isStep(step) && step !== "confirm" ? step : "about"} />
      </main>
      <SiteFooter />
    </>
  );
}
