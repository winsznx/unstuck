Other agents can call UNSTUCK today through its MCP server at `https://unstuck-near.vercel.app/mcp`. It needs no sign-in and charges nothing. UNSTUCK has no listing on NEAR Agent Market and no Claude Code skill yet, so those two ways in aren't open. The same page at [/agents](/agents) shows a sample answer built from a stored run.

## What exists

| Part | State |
| --- | --- |
| The check itself | Live on this site, through [/start](/start) |
| The MCP server at `/mcp`, with four tools | Live |
| UNSTUCK's own NEAR Agent Market listing | Not listed yet |
| A Claude Code skill | Not built yet |

The MCP server builds a check the same way [/start](/start) does and returns the answer described below.

## The job

An agent hands UNSTUCK the reviewer's comment on a public GitHub thread. UNSTUCK reruns the reviewer's checks at the commit they saw and returns each ask word for word with a verdict, a link to the run record behind it, and a brief a fixing agent can start from.

### What goes in

| Field | Required | Meaning |
| --- | --- | --- |
| `thread` | Yes | A public GitHub issue or pull request URL. A link to one comment picks that comment |
| `repo` | No | The code repo's GitHub address, when the thread links several or none |
| `asks` | No | The reviewer's sentences that count as asks, copied exactly. A sentence that isn't in the comment word for word is refused. Leave it out and NEAR AI picks them from the comment |
| `checks` | No | `{ ask, command }` pairs. Each command runs offline at the reviewed commit and is tied to an ask by its number. An ask with no check gets one suggested from the repo |
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

- An MCP server. Live at `https://unstuck-near.vercel.app/mcp`, stateless Streamable HTTP, no sign-in. Claude Code connects with `claude mcp add --transport http unstuck https://unstuck-near.vercel.app/mcp`.
- A job on NEAR Agent Market. Not listed yet. The brief would carry the thread link, and the answer would come back as the delivery, with the run record link as the evidence.
- A Claude Code skill. Not built yet.

### The MCP tools

| Tool | Input | What it returns |
| --- | --- | --- |
| `unstuck_check` | `thread`, and optionally `repo`, `asks`, `checks` and `image` | Starts a check and returns `milestoneId`, `asksFrom` (`caller` or `near-ai`) and the answer above as the run starts |
| `unstuck_status` | `milestone` | The answer above, plus `fix`: the latest fix run with each ask's change, or `null` |
| `unstuck_check_fix` | `milestone`, `fix` | Starts a fix check from a pull request link, commit link or SHA and returns the fix run's record link |
| `unstuck_suggest_asks` | `thread` | The sentences NEAR AI counts as asks, word for word with their position and a reason. Runs nothing |

Runs take one to a few minutes, so poll `unstuck_status` until `status` is no longer `running`. A fix is checked the way [Checking a fix](/docs/get-it-fixed#checking-a-fix) describes, and each ask in `fix` comes back `fixed`, `still-missing`, `broke`, `still-works`, `unsure` or `pending`. Runs share one worker, so a new check is refused while 6 runs are waiting or running. Nothing posts to GitHub.

## What every answer holds to

- It reads and doesn't write. No comments, pushes or pull requests come from the check itself.
- Asks are the reviewer's exact sentences with their position in the comment. Nothing is summarized into a different claim.
- No verdict without a run. Every `still_missing` and `works` points at an exit code in a stored run anyone can open.
- Public code only. If the repo isn't public, the check refuses and doesn't ask for a token.

## Price

The MCP server is free. There's no Agent Market listing yet, so there's no price there. When the listing opens, the price is set on NEAR Agent Market and shown there before a job is posted. Grantees using UNSTUCK directly read and rerun for free. [Hiring a fix](/docs/get-it-fixed) covers the other direction, where UNSTUCK hires an agent.
