You need a public GitHub issue or pull request that holds your reviewer's comment. [/start](/start) takes you through five steps, and nothing runs until the last one. You don't sign in, and nothing is posted or charged.

## Before you start

- The thread and the code repo must both be public. A private repo ends with a message that UNSTUCK couldn't open it.
- The asks must be in the comment. If your reviewer put them in a linked file, UNSTUCK can't read them yet.
- Have a command in mind for each ask, or be ready to take a suggested one. A command that exits 0 when the ask is met is what makes a check.

## Paste the link

Open your reviewer's comment on GitHub, use its menu to copy the link, and paste it. A link to the issue or pull request also works.

UNSTUCK reads the whole thread: the opening post, every comment, and for a pull request its reviews and review comments. Bot comments and empty ones are dropped. If your link points at a comment, that comment is selected. Otherwise it suggests the latest comment from someone other than the person who opened the thread, and you can pick a different one.

If GitHub is limiting how often UNSTUCK can read, the page says so and asks you to wait a minute. A link that isn't an issue or pull request is refused with an explanation.

## Confirm the commit

UNSTUCK lists repos linked in the thread. For a pull request the first one is the pull request's own repo. If no repo is linked, paste the repo's address, like `https://github.com/org/repo`. Links to files or branches don't work here.

It then finds the last commit before the comment was written:

- For a pull request whose code is in the same repo, the last commit on the pull request's branch before the comment.
- Otherwise the last commit on the repo's default branch before the comment.

You see the commit before anything runs. If the repo has no commits from before the comment, UNSTUCK says so and asks whether you picked the repo your reviewer looked at. [Checks and reruns](/docs/checks#the-commit) explains why the commit is fixed.

## Pick the asks

UNSTUCK splits the comment into sentences. NEAR AI Cloud reads them and ticks the ones it counts as asks, each with a short reason. It can only pick from these sentences, so every ask stays word for word, and it ticks nothing if you've already started picking. Untick any that aren't asks, tick any it missed, and skip greetings, context and link lists. You can pick up to 12. If NEAR AI doesn't answer, nothing is ticked and you pick by hand.

Each pick is kept word for word with its position in the comment. When you start the run, UNSTUCK reads the comment from GitHub again. If your reviewer edited it since you picked, the run is refused and you pick again. [Asks and tags](/docs/asks-and-tags) covers what makes a good ask.

## Give each ask a check

This step has two parts.

The install is a command that runs once, first, with the network on. UNSTUCK suggests one from your repo's files, like a lockfile install for a Node project, `cargo fetch` for Rust or `go mod download` for Go. You can edit it or clear it. If the install fails, no check runs and every ask is marked Not sure, so a broken install never reads as missing work.

Each ask gets one check, a shell command that runs inside the repo folder at that commit with the network off. Exit 0 means the ask is met. UNSTUCK offers up to three suggestions per ask, taken from commands your reviewer wrote in the comment and from keywords in the ask, such as tests, build, lint, README, docs, CI, license, Docker and examples. Your own command works too.

An ask with no check is marked Not sure, and nothing is guessed. At least one ask needs a check, or the run is refused. You also choose the container image. UNSTUCK preselects one from your repo, and [Checks and reruns](/docs/checks#the-container) lists the choices.

## Run it

Press the button on the last step. UNSTUCK saves the milestone, queues the run and opens your milestone page at `/m/<id>`. The page updates by itself as each step finishes.

Your browser remembers the milestones you've opened so [/m](/m) can list them. That list lives in your browser only.

## Read the result

Each ask shows a tag and, for one that's Still missing, the step that failed and the line it stopped on. Open the [run record](/docs/run-records) for every command, exit code and output hash.

Once you've pushed a fix, paste its pull request, commit link or SHA on the check screen. [Checking a fix](/docs/get-it-fixed#checking-a-fix) explains how it's rerun.

If nothing is still missing, the page offers a reply draft to send your reviewer. [Send it to your reviewer](/docs/send-to-reviewer) covers what's in it.

## If something goes wrong

| What you see | What it means |
| --- | --- |
| The thread wasn't read | The link wasn't an issue or pull request, the repo is private, or GitHub didn't answer. The message says which. |
| The commit wasn't found | The repo has no commit from before the comment. |
| The comment changed | Your reviewer edited it after you picked. Pick the sentences again. |
| The run couldn't start | The checkout failed. Nothing was judged and no ask is marked Still missing. |
| Every ask is Not sure after an install failure | The install failed, so no check ran. Fix the install command and run again. |
