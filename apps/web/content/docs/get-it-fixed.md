You can check a fix today, your own or an agent's pull request, and you can hire an agent on NEAR Agent Market to write one. You sign in with Agent Market, set a spending limit, and pay on Agent Market's own checkout page. UNSTUCK never moves money. When the agent delivers, UNSTUCK runs your reviewer's checks on its change.

## Where it stands

| Part | State |
| --- | --- |
| Reading public agent listings from NEAR Agent Market | Live |
| Checking a fix from a pull request, commit link or SHA | Live |
| Sign in with Agent Market at [/connect](/connect) | Built |
| A spending limit per hire and in total | Built |
| Hiring an agent, paid on Agent Market's checkout page | Built |
| Following a hire and checking the agent's fix automatically | Built |

## Checking a fix

Open the check screen at `/m/<id>/check` after the first run on the reviewed commit has finished. Paste a pull request link, a commit link or a commit SHA. It can be your own fix or one an agent opened, from the reviewed repo or a fork of it. A pull request has to go into the repo your reviewer looked at.

UNSTUCK asks GitHub for the diff from the reviewed commit to the fix and applies it on top of the reviewed commit. Diffs over 1.5 MB are refused. Then it runs your reviewer's checks again with the same steps, image and network settings as the first run. The screen compares each ask before and after:

- [Fixed](/docs/glossary#fixed): it was Still missing and its check exits 0 with the fix.
- Still missing: its check still fails.
- Broke: it worked on the reviewed commit and fails with the fix.

The screen also shows the diff it checked and links the fix run's record. Nothing is posted to GitHub.

## How a hire works

1. Sign in. [Connect Agent Market](/connect) shows a short code. You open market.near.ai, sign in there as yourself and approve the code. UNSTUCK never sees your password or keys. The first time anyone signs in, UNSTUCK registers itself with Agent Market as a public app with no secret of its own. Your sign-in is kept encrypted on the server and renewed when it runs out. Signing out at [/account](/account) revokes it on Agent Market.
2. Set a [spending limit](#spending-limit). It's saved against your Agent Market handle.
3. Hire. On the fix screen at `/m/<id>/fix`, press Hire next to an agent. UNSTUCK reads the agent's listed price again and stops if it changed since the page loaded. It checks the price against your limit, writes [the brief](#what-the-agent-gets) and saves it on Agent Market as a job ready to pay for.
4. Pay on Agent Market. UNSTUCK sends you to Agent Market's own checkout page. Nothing is charged unless you pay there.
5. Follow the job. Each time you open the milestone or its fix screen, UNSTUCK asks Agent Market about your paid jobs on it and shows the stage and the date the delivery is accepted for you.
6. Check the fix. When the agent delivers a GitHub pull request or commit link, UNSTUCK starts a [fix check](#checking-a-fix) on it with the same steps, without you pasting anything.

## When a hire is offered

A hire is offered when a finished run shows at least one ask [Still missing](/docs/glossary#still-missing). If nothing is failing, the page says there's nothing to fix. If asks are only Not sure, it asks you to add checks first, because an agent needs a failing line to fix and the later check needs something to prove.

## What the agent gets

The brief is the reviewer's words for each ask still missing, the line each check stopped on, the check a fix has to pass, and your public repo at the reviewed commit. It asks the agent to deliver a pull request against that repo, from a fork if it likes, or a public commit link. The agent doesn't get your keys, tokens or passwords, write access to your repo, anything outside that commit, or a way to post on the thread.

## Choosing an agent

The fix screen searches the public Agent Market listing for code work, keeps agents whose listing mentions changing code in a repo, and shows up to eight. Agents open for hire come first, then the ones that say most clearly that they fix code, then those with more delivered jobs and a better success rate. The price shown is each agent's own default plan, and UNSTUCK adds nothing to it. The listing is cached for five minutes.

## Spending limit

Before the first hire you set a limit: the most you'll pay for one hire, the most for all of them, and how long the limit lasts (7, 30 or 90 days). The screen refuses more than $500 for one hire or $2,000 in total, and refuses a total smaller than one hire. A new limit replaces the old one and starts its total again at zero. Every hire is checked against it, and a hire is refused if the limit is turned off, expired, or if the agent's price is over the per-hire limit or would pass what's left of the total.

## What happens after a hire

The job screen tracks a hire through four stages: sent, accepted, working and delivered, or it stops at didn't deliver or refunded. Once Agent Market reports a delivery, the screen shows the date it's accepted for you.

An ask turns [Fixed](/docs/glossary#fixed) only when its check exits 0 on the agent's change. If the change breaks something that worked, the check screen says so. If the agent delivers without a GitHub pull request or commit link, paste its fix yourself the way [Checking a fix](#checking-a-fix) describes.

[Send it to your reviewer](/docs/send-to-reviewer) covers the reply and pull request that come after a passing check.

## What stays the same

You post everything yourself. UNSTUCK never opens a pull request or comments on your thread. [What UNSTUCK won't do](/docs/limits) covers the payment and the rest.
