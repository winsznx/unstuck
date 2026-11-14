import { showcase, type MilestoneView } from "@/lib/queries";
import { buildStudy } from "@/lib/study";
import { loadStudyInput } from "@/lib/study-data";
import { Audience } from "./audience";
import { showcaseOf, studyFactsOf, type Showcase, type StudyFacts } from "./facts";
import { Fix } from "./fix";
import { Hero } from "./hero";
import { How } from "./how";
import { Problem } from "./problem";
import { Proof } from "./proof";
import { Questions } from "./questions";

/** The landing's sections in page order. The keys are also the /dev/landing/[section] preview's paths. */
export const LANDING_SECTIONS = ["hero", "problem", "how", "proof", "fix", "limits", "questions"] as const;

export type LandingSectionKey = (typeof LANDING_SECTIONS)[number];

export function isLandingSection(key: string): key is LandingSectionKey {
  return LANDING_SECTIONS.some((section) => section === key);
}

/** What the landing reads on each request. */
export interface LandingData {
  view: MilestoneView | undefined;
  show: Showcase | null;
  study: StudyFacts | null;
}

/**
 * The scenes read the first showcase milestone; the problem section reads the study's live counts. A failed study
 * read leaves its line out rather than taking the page down.
 */
export async function loadLanding(): Promise<LandingData> {
  const [[view], study] = await Promise.all([
    showcase(),
    loadStudyInput()
      .then((input) => studyFactsOf(buildStudy(input)))
      .catch(() => null),
  ]);
  return { view, show: view ? showcaseOf(view) : null, study };
}

/** One section with the props the landing gives it, so the landing and its preview render the same thing. */
export function LandingSection({ section, data: { view, show, study } }: { section: LandingSectionKey; data: LandingData }) {
  switch (section) {
    case "hero":
      return <Hero view={view} show={show} />;
    case "problem":
      return <Problem study={study} />;
    case "how":
      return <How view={view} show={show} />;
    case "proof":
      return <Proof view={view} show={show} />;
    case "fix":
      return <Fix view={view} show={show} />;
    case "limits":
      return <Audience />;
    case "questions":
      return <Questions />;
  }
}
