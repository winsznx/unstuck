An ask is one sentence from your reviewer's comment that you picked, and a tag is what a run proved about it. The tag changes only when a run changes it.

## What counts as an ask

You choose the asks. UNSTUCK splits the comment into sentences, drops quote markers and list bullets from the front of each, and ignores fragments with fewer than 12 letters. You tick the sentences where your reviewer asks for something.

Each ask is a word-for-word span of the comment, stored with where it starts. Before a run is saved, UNSTUCK reads the comment from GitHub again and refuses the run if any ask no longer matches. The milestone page and the run record quote the ask as written, and link to the whole comment.

UNSTUCK doesn't decide which asks block your payment. Every ask is stored as "Not clear if it blocks payment", and your reviewer is the one who knows. A vague ask can stay Not sure, or you can leave it out and ask your reviewer what they need.

## The tags

| Tag | When it's given |
| --- | --- |
| Works | Every check for the ask exited 0 |
| Still missing | A check for the ask failed or ran out of time |
| Not sure | No check covers the ask, or its check never ran |
| Open | The run hasn't finished, so there's no verdict yet |
| Fixed | Not given today. See below |

### Works

All of the ask's checks exited 0 on the reviewed commit. It means a command exited 0 on that commit. It doesn't mean the command tests what your reviewer meant. The [run record](/docs/run-records) shows the exact command next to the ask's words so your reviewer can judge that.

### Still missing

A check exited with a code other than 0, or hit its time limit. The milestone page shows the step, whether it exited or timed out, how long it took, whether the network was on, and the line that decided it. UNSTUCK picks that line from the end of the output: the first line that looks like an error, or the last line when none does.

### Not sure

The ask had no check, or its check didn't run because an earlier step failed. Nothing is guessed, and Not sure never counts as passed or failed.

### Open

An ask is Open from the moment you start a run until it finishes. If the run can't start at all, the asks stay Open, nothing is judged and no ask is marked Still missing.

### Fixed

Fixed is a tag for an ask that was Still missing on the reviewed commit and passes on an agent's change. It needs [a fix to check](/docs/get-it-fixed), and hiring is off, so no ask has this tag today.

## How a tag is decided

For each ask UNSTUCK looks at the steps planned for it.

1. If any of them failed or timed out, the ask is Still missing.
2. Otherwise, if no step was planned for the ask or one of them has no result, it's Not sure.
3. Otherwise, every step exited 0 and the ask is Works.

A step that timed out has no exit code and counts as Still missing. The rule is the same one the [study](/docs/study) uses, so the counts there match the pages here.

## What a tag doesn't say

A tag describes one commit on one day. Your branch has probably moved since, and a later push doesn't change a record. A tag also can't say your reviewer will accept the work. [What UNSTUCK won't do](/docs/limits) covers that.
