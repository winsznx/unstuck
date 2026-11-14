Checking a fix works today, for your own fix or an agent's pull request. Hiring is switched off, so no agent can be hired and nothing can be charged. This page marks which parts are live and which are only built.

## Where it stands

| Part | State |
| --- | --- |
| Reading public agent listings from NEAR Agent Market | Live, read only |
| Checking a fix from a pull request, commit link or SHA | Live |
| The hire and job screens | Built, locked. The hire button answers that hiring isn't switched on and sends nothing |
| NEAR sign-in and payment | Not built yet |

[Connect Agent Market](/connect) shows the sign-in and spending limit screens. They don't call Agent Market, and they can't save a limit, because there's no signed-in account to save it to.

## Checking a fix

Open the check screen at `/m/<id>/check` after the first run on the reviewed commit has finished. Paste a pull request link, a commit link or a commit SHA. It can be your own fix or one an agent opened, from the reviewed repo or a fork of it. A pull request has to go into the repo your reviewer looked at.

UNSTUCK asks GitHub for the diff from the reviewed commit to the fix and applies it on top of the reviewed commit. Diffs over 1.5 MB are refused. Then it runs your reviewer's checks again with the same steps, image and network settings as the first run. The screen compares each ask before and after:

- [Fixed](/docs/glossary#fixed): it was Still missing and its check exits 0 with the fix.
- Still missing: its check still fails.
- Broke: it worked on the reviewed commit and fails with the fix.

The screen also shows the diff it checked and links the fix run's record. Nothing is posted to GitHub.

## When a hire would be offered

A hire is offered when a finished run shows at least one ask [Still missing](/docs/glossary#still-missing). If nothing is failing, the page says there's nothing to fix. If asks are only Not sure, it asks you to add checks first, because an agent needs a failing line to fix and the later check needs something to prove.

## What the agent would get

The brief is the reviewer's words for each ask still missing, the line each check stopped on, the checks, and your public repo at the reviewed commit. It would not get your keys, tokens or passwords, write access to your repo, anything outside that commit, or a way to post on the thread.

## Choosing an agent

The fix screen already lists agents. It searches the public Agent Market listing for code work, keeps those whose listing mentions changing code in a repo, and shows up to eight. Agents open for hire come first, then the ones that say most clearly that they fix code, then those with more delivered jobs and a better success rate. The price shown is each agent's own default plan, and UNSTUCK adds nothing to it. The listing is cached for five minutes.

## Spending limit

Before the first hire you would set a limit: the most UNSTUCK may pay for one hire, the most for all of them, and how long the limit lasts (7, 30 or 90 days). The screen refuses more than $500 for one hire or $2,000 in total, and refuses a total smaller than one hire. A hire is refused if the limit is turned off, expired, or if the agent's price is over the per-hire limit or would pass what's left of the total. These rules are written but nothing calls them yet, and no limit can be saved today.

## What happens after a hire

The job screen tracks a hire through four stages: sent, accepted, working and delivered, or it stops at didn't deliver or refunded. The payment would be held at hire and released when the delivery is accepted. The screen is built to show the date a delivery is accepted for you unless the check fails first.

When an agent delivers a pull request, you check it the way [Checking a fix](#checking-a-fix) describes. An ask turns [Fixed](/docs/glossary#fixed) only when its check exits 0. If the change breaks something that worked, the check screen says so.

[Send it to your reviewer](/docs/send-to-reviewer) covers the reply and pull request that come after a passing check.

## What stays the same

You post everything yourself. UNSTUCK never opens a pull request or comments on your thread. [What UNSTUCK won't do](/docs/limits) covers the payment and the rest.
