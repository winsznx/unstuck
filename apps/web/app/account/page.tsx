import type { Metadata } from "next";
import { SignedOutAccount, AccountOverview } from "@/components/account";
import { SiteFooter, SiteHeader } from "@/components/site";
import { Button } from "@/components/button";
import { readAccount } from "@/lib/market-session";
import { signOut } from "../connect/actions";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = { title: "Your account", robots: PRIVATE_PAGE };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const account = await readAccount();
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-(--container-content) px-4 pt-4 pb-16 sm:px-6 sm:pt-8">
        <h1 className="text-display font-semibold">Your account</h1>
        <p className="mt-3 max-w-(--container-reading) text-lead text-ink-secondary">
          Your NEAR Agent Market connection, the limit UNSTUCK hires under, and every hire it made for you.
        </p>
        <div className="mt-8">{account.status === "signed_in" ? <AccountOverview
              account={account}
              now={new Date()}
              actions={
                <form action={signOut}>
                  <Button type="submit" variant="secondary">
                    Sign out
                  </Button>
                </form>
              }
            /> : <SignedOutAccount />}</div>
      </main>
      <SiteFooter />
    </>
  );
}
