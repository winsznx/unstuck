import type { ReactNode } from "react";
import { DocsShell } from "@/components/docs/docs-shell";
import { SiteFooter, SiteHeader } from "@/components/site";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <DocsShell>{children}</DocsShell>
      <SiteFooter />
    </>
  );
}
