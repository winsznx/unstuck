UNSTUCK is a website for grantees. You paste a link to your reviewer's comment, pick the sentences that ask for something, and give each one a command that exits 0 when the ask is met. UNSTUCK runs those commands on a fresh copy of your code and tags every ask from the exit codes.

## Who it's for

UNSTUCK is for a grantee who has delivered a milestone and is waiting on a reviewer. The reviewer listed what's still open in a comment on a public GitHub issue or pull request, and acceptance waits on those items.

It works for any program that reviews on public GitHub, as long as the asks are written in the comment itself. A comment that only points to a linked evaluation file doesn't work yet, because UNSTUCK reads the thread and not the files it links to. Private repos aren't supported either.

## What it does

- Reads the public thread and finds the last commit before your reviewer's comment.
- Asks NEAR AI Cloud which sentences are asks and ticks its picks, each with a reason. You keep or change them. Each ask is kept word for word and checked against GitHub again before it's saved.
- Suggests a check for each ask from your repo's files and from any command your reviewer wrote. You can change every one of them.
- Runs the checks in a [container](/docs/glossary#container) with the network off, and records the command, exit code and output hash of each.
- Tags each ask [Works](/docs/glossary#works), [Still missing](/docs/glossary#still-missing) or [Not sure](/docs/glossary#not-sure), and gives you a public [run record](/docs/run-records) your reviewer can open.
- Checks your fix when you paste its pull request, commit link or SHA, by rerunning the same checks with it applied on top of the reviewed commit.
- Answers other agents through an [MCP server](/docs/agents) at `/mcp`.
- Lets you [hire an agent](/docs/get-it-fixed) on NEAR Agent Market for what's still missing, inside a spending limit you set, and checks the fix it delivers.

Every run checks the commit your reviewer saw, not your branch today. A record shows what was missing then, and a [fix check](/docs/get-it-fixed#checking-a-fix) shows whether your fix closes it.

## What works today

| Part | State |
| --- | --- |
| Checks and public run records | Live |
| NEAR AI Cloud suggesting asks | Live |
| Checking a fix from a pull request, commit link or SHA | Live |
| MCP server at `/mcp` for other agents | Live |
| Sign in with NEAR Agent Market at [/connect](/connect) | Built |
| A spending limit per hire and in total | Built |
| Hiring an agent, paid on Agent Market's checkout page | Built |
| Following a hire and checking the agent's fix automatically | Built |
| UNSTUCK's own Agent Market listing | Not built yet |
| A Claude Code skill | Not built yet |

Reading the comment, rerunning the checks and checking a fix are free. A hire costs the agent's listed price, paid on Agent Market. [Hiring a fix](/docs/get-it-fixed) and [Call UNSTUCK from an agent](/docs/agents) say at the top which parts are live.

## What UNSTUCK won't do

It doesn't post to your thread, reword your reviewer, or call anything fixed on trust. [What UNSTUCK won't do](/docs/limits) has the full list, starting with the payment.

## Where to go next

- [Check your first review](/docs/getting-started) walks through the five steps at [/start](/start).
- [Asks and tags](/docs/asks-and-tags) explains what each tag means and how it's decided.
- [Run records](/docs/run-records) shows what your reviewer sees when you share a run, and how to rerun it yourself.
- [The study](/docs/study) explains the counts on [/study](/study).
- [FAQ](/docs/faq) answers the questions grantees ask most, and the [glossary](/docs/glossary) defines the terms.
