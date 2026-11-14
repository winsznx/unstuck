A run record is the page UNSTUCK saves for every run, at `/runs/<id>`. It shows each command, where it ran, how it exited and what it printed, so a reviewer can check the result without trusting UNSTUCK.

## What's on a record

The top of the page names the repo and the first seven characters of the commit, then gives the result in one line: all checks passed, some failed, some didn't run, or the run couldn't start. Under it:

| Field | What it holds |
| --- | --- |
| Commit | The full commit hash, with a copy button |
| Repository | The code repo on GitHub |
| Ran on | The reviewed commit, unchanged, or for a [fix check](/docs/get-it-fixed#checking-a-fix) a proposed fix and how many files it changes |
| Image | The container image the steps ran in |
| Started, Finished, Took | Times in UTC |
| Reviewer's comment | A link to the comment on GitHub |

A link at the top goes back to the milestone page, which shows the tags.

## Reading a step

Step 0 is the checkout: a shallow fetch of exactly that commit into an empty volume. The install, if there is one, and the checks follow in order. Each step shows:

- The name and a tag: passed, failed, timed out, or didn't run.
- For a check, the ask's words it tests, quoted from the reviewer's comment.
- The exact command, with a copy button.
- Whether the network was on, how long it took, and the [output hash](/docs/glossary#output-hash) with the number of bytes.
- The end of the output. A failed step opens with its deciding line highlighted. If the output was longer than 64 KB, the page keeps the last 64 KB.

A step that never ran has no exit code and no output, and the record says so. It isn't counted as passed or failed.

## Reproduce it

Every record with steps ends with a script you can paste into a terminal. You need Docker. The script:

1. Creates an empty volume.
2. Fetches the commit into it with `alpine/git`.
3. Runs each step in its own container from the same image, with the same network setting, a read-only root, a scratch `/tmp`, `HOME` and `CI` set, all capabilities dropped and no privilege escalation.
4. Removes the volume.

The script doesn't set the CPU, memory, process or time limits the worker applies, so a very heavy check could behave differently on a small machine. A command that prints timings or absolute paths won't produce the same output hash either. On a fix check's record the script leaves the fix out, so it reruns the reviewed commit.

## Where records live

Records are public and permanent. [/runs](/runs) lists every run, newest first, with its commit, result and how long it took. Finished records are listed in the site's sitemap. Records that are still running, and milestone pages, are marked so search engines skip them. Nothing removes a record, and there's no way to unlist one.

The [study](/docs/study) counts the reviews behind these records, and [What it reads and saves](/docs/data) lists what a record contains.

## When a run can't start

If the checkout fails, the record says "This run couldn't start. Nothing was judged" and shows the error. That points to a problem with the run and says nothing about your repo, so no ask is marked [Still missing](/docs/glossary#still-missing) because of it. Start the run again from the milestone page.
