import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Newsreader, Schibsted_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { THEME_BOOT_SCRIPT } from "@/components/shell/theme";
import { INDEXABLE, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const schibsted = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-schibsted", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", style: ["normal", "italic"], display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: { default: "UNSTUCK | Get a stuck grant milestone review closed", template: "%s | UNSTUCK" },
  description: "Your reviewer left one comment. UNSTUCK reruns their steps on the commit they reviewed and shows what still fails, with the log line behind every tag.",
  robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: { siteName: SITE_NAME, type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#141819" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The boot script sets data-theme before React hydrates, so the attribute is expected to differ from the server.
    <html lang="en" className={`${schibsted.variable} ${newsreader.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
