import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Development pages: the palette, the component preview and the landing one section at a time. Nothing links here,
 * search engines are told to skip it, and a production build answers not found. The palette and the component preview
 * render sample data; /dev/landing/[section] renders the stored showcase exactly as the landing does.
 */
export default function DevLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
