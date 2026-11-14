/**
 * One public milestone review, as the landing's problem section tells it. Dates are the GitHub API timestamps read on
 * 7 November 2026. The status, the outstanding issues, the quoted issue and the failing test run come from the first
 * version of the reviewer's evaluation file (commit f16f736, 1 December 2025).
 */
export const PUBLIC_REVIEW = {
  program: "Web3 Foundation Grants",
  milestone: "eliza-plugin-dot, milestone 1",
  threadUrl: "https://github.com/w3f/Grant-Milestone-Delivery/pull/1296",
  /** The evaluation as first posted, before the milestone was accepted. */
  evaluationUrl: "https://github.com/w3f/Grant-Milestone-Delivery/blob/f16f736f5d75c70fa592d4ce3a94bbc88fe965da/evaluations/eliza-plugin-dot_1_diogo-w3f.md",
  reviewer: "diogo-w3f",
  /** The delivery pull request was opened. */
  deliveredAt: "2025-11-08T14:17:11Z",
  /** issuecomment-3597000564, the reviewer's first evaluation. */
  firstReviewAt: "2025-12-01T14:55:18Z",
  /** issuecomment-3716162164 (tried again, the transfer failed) and issuecomment-3725702612 (approved). */
  laterReviewsAt: ["2026-01-06T20:15:18Z", "2026-01-08T20:41:23Z"],
  /** The pull request was merged; the evaluation file's status reads Accepted. */
  acceptedAt: "2026-01-08T20:41:32Z",
  /** The first evaluation's status and its four Outstanding Issues, in its order. */
  status: "Changes requested",
  outstanding: ["an unfinished testing guide", "API keys hard-coded in the source", "no tests for the action layer", "E2E steps nobody could reproduce"],
  /** Outstanding issue 2, word for word: its bold title and its closing request, from line 28 of that first version. */
  issue: {
    number: 2,
    words: ["Live API keys in source/tests.", "Please move keys and endpoints to environment variables."],
    url: "https://github.com/w3f/Grant-Milestone-Delivery/blob/f16f736f5d75c70fa592d4ce3a94bbc88fe965da/evaluations/eliza-plugin-dot_1_diogo-w3f.md?plain=1#L28",
  },
  /** A test run the evaluation records failing until the reviewer added the missing dependency themselves. */
  repo: "eliza-dot-aes",
  command: "pnpm run test:coverage",
  failure: "Cannot find module 'ethereum-cryptography/aes.js'",
} as const;
