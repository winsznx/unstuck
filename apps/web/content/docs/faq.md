Short answers to the questions grantees ask most, grouped by topic. Each answer links to the page with the details.

## Using it

### Who is UNSTUCK for?

Grantees who have delivered a milestone and are waiting on a reviewer's comment on public GitHub. See [What is UNSTUCK](/docs#who-it-s-for).

### Do I need an account?

No. You paste a link and nothing asks you to sign in. Your browser remembers the milestones you've opened so [/m](/m) can list them. See [What it reads and saves](/docs/data#what-it-keeps).

### My review is a file in the PR. Does that work?

Not yet. Any program that reviews on public GitHub works if the asks are in a comment. Linked evaluation files, common at Web3 Foundation, aren't read yet. See [What UNSTUCK won't do](/docs/limits#what-it-reads-and-what-it-skips).

### Does it work on a private repo?

No. Both the thread and the code repo must be public. See [Check your first review](/docs/getting-started#before-you-start).

### My reviewer's comment is vague. Will this help?

Only where a sentence can become a check. If one asks for nothing you can test, leave it out or let it stay Not sure, and ask your reviewer what they need. See [Asks and tags](/docs/asks-and-tags#what-counts-as-an-ask).

## Tags and checks

### Can I check my fix commit?

Yes. Paste its pull request, commit link or SHA on the check screen. UNSTUCK applies it to the reviewed commit, reruns the same checks and marks each ask Fixed, Still missing or Broke. See [Hiring a fix](/docs/get-it-fixed#checking-a-fix).

### What does Works mean?

One command, or all of an ask's commands, exited 0 on that commit. It doesn't mean the command tests what your reviewer meant. See [Asks and tags](/docs/asks-and-tags#works).

### Why is an ask Not sure?

No check covers it, or its check never ran, for instance because the install failed. Nothing is guessed. See [Asks and tags](/docs/asks-and-tags#not-sure).

### Who writes the checks?

You choose them. UNSTUCK suggests commands from your repo's files and from commands your reviewer wrote in the comment, and you can edit every one. See [Checks and reruns](/docs/checks#suggested-checks).

### Can a check reach the network?

The checks can't. Only the checkout and the install step can. See [Checks and reruns](/docs/checks#the-container).

### Can I rerun a record myself?

Yes, with Docker. Every record ends with a script. See [Run records](/docs/run-records#reproduce-it).

## Your reviewer and the payment

### Will this get my milestone paid?

No. UNSTUCK can't make a funder pay, and your reviewer still decides. It gives you evidence to point at. See [What UNSTUCK won't do](/docs/limits#the-payment).

### I'm a reviewer. Why would I trust this?

Read the record, not the tag. A pass means one command exited 0 on one commit. Each command sits beside the words it checks, so a sentence of yours that isn't there had no check. See [Run records](/docs/run-records#reading-a-step).

### Does UNSTUCK post to my thread?

No. It drafts a reply and you post it. See [Send it to your reviewer](/docs/send-to-reviewer).

### Can I delete or unlist a run?

No. Every run is listed under Recorded runs, and your milestone gets its own page, both at permanent links. Nothing runs until you start it. See [Run records](/docs/run-records#where-records-live).

## Hiring and agents

### Can UNSTUCK hire an agent to fix what's missing?

Not today. The screens are built, but hiring is switched off. See [Hiring a fix](/docs/get-it-fixed).

### Can my own agent call UNSTUCK?

Yes, through the MCP server at `https://unstuck-near.vercel.app/mcp`. It has four tools and needs no sign-in. There's no Agent Market listing yet. See [Call UNSTUCK from an agent](/docs/agents).

## Cost and data

### What does it cost?

Reading the comment and rerunning the checks are free. Hiring isn't switched on, so nothing can be charged today. See [Hiring a fix](/docs/get-it-fixed#spending-limit).

### What is public?

Run records, the milestone page you share, and the study listing are public and permanent. See [What it reads and saves](/docs/data#what-s-public).

### How is the study counted?

Each reviewer comment counts once, from its latest finished rerun. See [The study](/docs/study#how-a-review-is-counted).
