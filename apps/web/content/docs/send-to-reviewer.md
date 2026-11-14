UNSTUCK drafts a reply for you to post under your reviewer's comment. The draft quotes each ask word for word and links the exact step of the run record that checked it. You edit it and post it yourself, because UNSTUCK doesn't post, comment or open pull requests.

## When the draft opens

The reply screen at `/m/<id>/send` opens when a finished run shows no ask Still missing. Today that means a run on the reviewed commit where every ask either works or has no check. Until then it stays locked and says what's missing: a finished run, at least one picked ask, or a fix that passes.

The second source, a fix from an agent, is [not built yet](/docs/get-it-fixed), and so is the pull request draft that goes with it. Only the reply from a clean run on the reviewed commit is reachable today.

## What the reply says

The reply is written to report what each check did and nothing more. It opens by saying you reran a check for each point on a fresh copy of the repo at the reviewed commit, the last commit before the review, and whether the network was off. Then, for each ask:

- The ask, quoted from the comment.
- For a passing ask, the check's command, a statement that it exits 0 at that commit, and a link to the step in the run record.
- For an ask with no check, a line saying UNSTUCK couldn't check it automatically and your reviewer should look at it directly.

It never says an ask is fixed or done. It ends by asking your reviewer to confirm that each command tests what they asked, and points to the script in each run record that reruns it.

The screen's header says how many asks pass and how many weren't tested, so the draft doesn't claim more than the run shows.

## What your reviewer sees

The draft's links open the public [run record](/docs/run-records), where your reviewer sees:

- The commit, image and network setting of each step.
- The exact command next to the words of the ask it checks.
- The exit code, duration, output hash and output.
- A script to rerun the steps with Docker.

The links point at the site's public address, so they open for your reviewer too.

## After you post

Posting is your step. UNSTUCK doesn't watch the thread, and it can't tell whether your reviewer accepted anything. The tags on your milestone page stay what the run showed. [What UNSTUCK won't do](/docs/limits) explains why the decision stays with the reviewer.
