This interface is planned and not open. UNSTUCK has no listing on NEAR Agent Market, no MCP server and no Claude Code skill yet, so no agent can hire it today. Everything below describes the contract they are being built to, and the same page at [/agents](/agents) shows a sample answer built from a stored run.

## What exists

| Part | State |
| --- | --- |
| The check itself | Live on this site, through [/start](/start) |
| UNSTUCK's own NEAR Agent Market listing | Not listed yet |
| An MCP tool named `unstuck_check` | Planned |
| A Claude Code skill | Planned |

There is no API route for the check today. The shapes below are what [/agents](/agents) shows and what the answer builder in the site produces from stored rows.

## The job

An agent hands UNSTUCK the reviewer's comment on a public GitHub thread. UNSTUCK reruns the reviewer's checks at the commit they saw and returns each ask word for word with a verdict, a link to the run record behind it, and a brief a fixing agent can start from.

### What goes in

| Field | Required | Meaning |
| --- | --- | --- |
| `thread` | Yes | A public GitHub issue or pull request URL. A link to one comment picks that comment |
| `asks` | No | The reviewer's sentences that count as asks, copied exactly. A sentence that isn't in the comment word for word is refused |
| `checks` | No | Shell commands run offline at the reviewed commit, each tied to an ask by its number. An ask with no check comes back `not_sure` |
| `image` | No | The container image for the checks. The default is picked from the repo's own files |

### What comes back

| Field | Meaning |
| --- | --- |
| `status` | One of `still_missing`, `works`, `not_sure`, `running`, `could_not_run` or `no_checks`. A run that couldn't start is never a verdict |
| `asks[]` | Each ask's exact quote, severity and verdict. A failing ask also has the step, check name, exit code, whether it timed out, and the line it stopped on |
| `asks[].failure.record` | A link straight to that step in the public run record |
| `code` | The repo and the full commit that was rerun |
| `runRecord` | The link to the [run record](/docs/run-records) |
| `milestone` | The link to the milestone page |
| `brief` | Plain text a fixing agent can start from: what's open, where it fails, and the bar a fix has to clear |

The verdicts map to the tags on [Asks and tags](/docs/asks-and-tags): `still_missing` is Still missing, `works` is Works and `not_sure` is Not sure. An ask whose run hasn't finished comes back as `open`. The brief ends with "A fix is done when the same checks exit 0 on the patch." When nothing is still missing it says so.

## Three ways to call it

- A job on NEAR Agent Market. Not listed yet. The brief would carry the thread link, and the answer would come back as the delivery, with the run record link as the evidence.
- An MCP tool. Planned. One tool, `unstuck_check`, with the same input fields and the same answer.
- A Claude Code skill. Planned. A terminal command, `unstuck check <thread-url>`, that prints the asks, their verdicts and the brief.

## What every answer would hold to

- It reads and doesn't write. No comments, pushes or pull requests come from the check itself.
- Asks are the reviewer's exact sentences with their position in the comment. Nothing is summarized into a different claim.
- No verdict without a run. Every `still_missing` and `works` points at an exit code in a stored run anyone can open.
- Public code only. If the repo isn't public, the check refuses and doesn't ask for a token.

## Price

Not listed yet. When the listing opens, the price is set on NEAR Agent Market and shown there before a job is posted. Grantees using UNSTUCK directly read and rerun for free. [Hiring a fix](/docs/get-it-fixed) covers the other direction, where UNSTUCK hires an agent.
