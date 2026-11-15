import { absoluteUrl } from "../site";

export const INTRODUCTION_SLUG = "introduction";

export interface DocPage {
  slug: string;
  title: string;
  /** One sentence. It's the page's lead, its meta description and its line in llms.txt. */
  description: string;
}

export interface DocSection {
  title: string;
  pages: readonly DocPage[];
}

/** The docs in reading order. Every page here needs content/docs/<slug>.md, and a test holds that. */
export const DOC_SECTIONS: readonly DocSection[] = [
  {
    title: "Start here",
    pages: [
      {
        slug: INTRODUCTION_SLUG,
        title: "What is UNSTUCK",
        description: "A tool for grantees whose milestone payment waits on a reviewer's comment: it reruns a check for each ask on the commit they reviewed and tags the ask from that run.",
      },
      {
        slug: "getting-started",
        title: "Check your first review",
        description: "Paste the issue or pull request with the review, confirm the asks and their checks, and read the tags that come back.",
      },
    ],
  },
  {
    title: "How it works",
    pages: [
      {
        slug: "asks-and-tags",
        title: "Asks and tags",
        description: "How a reviewer's comment becomes a numbered list of asks, and what each tag means.",
      },
      {
        slug: "checks",
        title: "Checks and reruns",
        description: "The commands that check each ask, the commit they run on, and the sealed container they run in.",
      },
      {
        slug: "run-records",
        title: "Run records",
        description: "The public page every run leaves behind, with its commit, exit codes, logs and a script to rerun it yourself.",
      },
      {
        slug: "get-it-fixed",
        title: "Hiring a fix",
        description: "Checking a fix from a pull request, commit link or SHA, and hiring an agent on NEAR Agent Market inside a spending limit, paid on Agent Market's checkout page.",
      },
      {
        slug: "send-to-reviewer",
        title: "Send it to your reviewer",
        description: "The reply UNSTUCK drafts from your run records, and what your reviewer sees when they open the links.",
      },
    ],
  },
  {
    title: "Trust",
    pages: [
      {
        slug: "limits",
        title: "What UNSTUCK won't do",
        description: "The things it can't decide or promise, starting with the payment, which stays your reviewer's call.",
      },
      {
        slug: "data",
        title: "What it reads and saves",
        description: "What UNSTUCK reads from GitHub, what it keeps, what's public, and what never leaves the run.",
      },
      {
        slug: "study",
        title: "The study",
        description: "How public grant reviews are collected and rerun for the study, and how to read its counts.",
      },
    ],
  },
  {
    title: "Reference",
    pages: [
      {
        slug: "agents",
        title: "Call UNSTUCK from an agent",
        description: "The MCP server at /mcp: four tools to start a check, read it, check a fix and suggest asks, with their inputs and outputs. No sign-in.",
      },
      {
        slug: "faq",
        title: "FAQ",
        description: "Short answers to the questions grantees ask most, each linked to the page with the details.",
      },
      {
        slug: "glossary",
        title: "Glossary",
        description: "Plain definitions of the words you meet in UNSTUCK and these docs.",
      },
    ],
  },
];

export interface IndexedDocPage extends DocPage {
  section: string;
  path: string;
  url: string;
}

export function docPath(slug: string): string {
  return slug === INTRODUCTION_SLUG ? "/docs" : `/docs/${slug}`;
}

export const DOC_PAGES: readonly IndexedDocPage[] = DOC_SECTIONS.flatMap((section) =>
  section.pages.map((page) => {
    const path = docPath(page.slug);
    return { ...page, section: section.title, path, url: absoluteUrl(path) };
  }),
);

export function findDocPage(slug: string): IndexedDocPage | undefined {
  return DOC_PAGES.find((page) => page.slug === slug);
}

export const markdownPath = (slug: string): string => `/docs/${slug}.md`;
