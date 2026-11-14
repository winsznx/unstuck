UNSTUCK can't make a funder pay. Your reviewer still decides whether a milestone is accepted, and nothing in a tag, a run record or a reply draft changes that. This page lists the other things it can't decide or promise.

## The payment

Approval and payment stay with your program. UNSTUCK reports what a command did on one commit. It doesn't approve grants, contact your funder, or release money held by anyone else. A reply that links passing checks is evidence for your reviewer to read, and the draft says so by asking them to confirm that each command tests what they asked.

## What a tag proves

- Works means a command exited 0 on the reviewed commit. It doesn't mean the command tests what your reviewer meant. The record shows the exact command beside the ask's words so your reviewer can judge that.
- Still missing means a command exited non-zero or ran out of time. A command that is wrong, or that needs something the container doesn't have, fails the same way. Read the record before you read the tag.
- Not sure means nothing was tested. A tag doesn't say your work is good or bad.
- A check sees only what its command looks at. A command that looks for a docs site config can't see a site hosted somewhere else, and with the network off a check can't test a live service.

## What it reads and what it skips

- It checks the commit your reviewer saw. It does not yet check your fix, so a record can't show that something was fixed.
- It reads public GitHub threads and public repos. Private repos aren't supported.
- It reads the comment, not the files the comment links to. Linked evaluation files, common at Web3 Foundation, aren't read yet.
- It doesn't decide which sentences are asks or which of them block payment. You pick the asks, and each is stored as not clear whether it blocks payment.
- It doesn't reword your reviewer. Each ask is a word-for-word span of their comment, checked against GitHub before it's saved, and the record links to the whole comment.

## What it never does for you

- It doesn't post on your thread, comment, push or open a pull request. Everything it drafts, you post.
- It doesn't ask for GitHub write access, your keys or your tokens. A run reads public GitHub and has no accounts inside the [container](/docs/checks#the-container).

## Runs and records

- A step that runs out of time counts as Still missing. The limits are 15 minutes for the install and 10 for each check.
- A run that can't start judges nothing and marks no ask Still missing.
- Every run is listed under [Recorded runs](/runs) at a permanent link. You can't delete or unlist one, and nothing runs until you start it.
- GitHub limits how often UNSTUCK can read. When it does, the page tells you to wait and try again.

## Money

Reading the comment and rerunning checks are free. Hiring isn't switched on, so nothing can be charged today. When it is, [every hire stays under the limit you set first](/docs/get-it-fixed#spending-limit).

## What isn't built

NEAR sign-in and payment, reruns on an agent's change, NEAR AI suggesting asks, UNSTUCK's MCP server and its own Agent Market listing don't exist yet. [Call UNSTUCK from an agent](/docs/agents) describes the planned interface.
