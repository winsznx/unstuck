UNSTUCK reads public GitHub, saves what a run needs to be checked later, and shows most of it on public pages. Checking a review needs no account. Only hiring needs an Agent Market sign-in. This page lists what is read, what is kept and who can see it.

## What it reads from GitHub

| Read | Why |
| --- | --- |
| The issue or pull request: title, opening post, author, state | To show the thread and tell your reviewer's comments from the opener's |
| Every comment, and for a pull request its reviews, review comments and head commit | To find your reviewer's comment and the commit |
| The list of commits on the code repo before the comment | To pin the last commit before the review |
| The file list at that commit, and its `package.json` scripts and package manager | To suggest an install, a container image and checks |
| The code itself, at that one commit | The run fetches it into a fresh container |

All of it is public data. UNSTUCK doesn't sign in as you or ask for a GitHub token from you. Private repos are refused. While you move between steps, repeated reads of the same thread are cached for five minutes. Starting a run reads the comment fresh. Checking a fix also reads the pull request's head commit and GitHub's diff from the reviewed commit to the fix.

The run's install step, and only that step besides the checkout, uses the network. It downloads the packages it names from wherever the install command points.

## What it sends to NEAR AI

To suggest asks, UNSTUCK sends NEAR AI Cloud the sentences of your reviewer's comment, numbered, and nothing else. No code, repo name, login or link goes with them. NEAR AI answers with sentence numbers and a short reason for each. Without a NEAR AI key on the server, nothing is sent and you pick the asks by hand.

## What it keeps

Starting a run saves:

- The milestone: the thread link, repo, title and opener's login, the code repo, the pinned commit, and the reviewer's login and comment, including its full text, link and time.
- Each ask: the quoted sentence, where it starts in the comment, and whether you picked it or kept it from a NEAR AI suggestion.
- The run: the container image, the planned steps, their status, any error, and start and finish times. A fix check also keeps the diff it applied.
- For each step: the command, whether the network was on, the exit code, whether it timed out, how long it took, the last 64 KB of output, the [output hash](/docs/glossary#output-hash) of the full output, and the number of bytes.

A work queue holds the pending runs.

If you sign in with Agent Market to hire, UNSTUCK also keeps:

- Your session: your Agent Market handle, your NEAR account id when Agent Market names one, whether your email is confirmed, the permissions you granted, and the sign-in tokens, encrypted with AES-256-GCM. Your browser gets a cookie holding only the session's id. Signing out ends the session here and revokes the tokens on Agent Market.
- Your spending limit: the cap per hire, the total, what's been spent and when it ends, saved against your handle.
- Your hires: the agent and its price, the brief sent to Agent Market, the job's stage and when the delivery is accepted for you, and the fix check started from the delivery.

Your balance is read from Agent Market each time you open [/account](/account) and isn't stored.

Your browser also keeps the ids of milestones you've opened, so that [/m](/m) can list them. That list is in your browser's local storage and doesn't leave it.

## What's public

Anyone with the link can open a milestone page at `/m/<id>`, and anyone can open a [run record](/docs/run-records). Both are permanent, and there is no delete or unlist. [/runs](/runs) lists every run. [/study](/study) lists every review that has been rerun and links to its record. A record shows the commands, the quoted asks and the end of each step's output. The reviewer's whole comment is on the milestone page.

Milestone pages are marked so that search engines skip them. Finished run records are listed in the site's sitemap.

## What never leaves the run

The container gets no accounts, tokens or secrets. Checks run with the network off. The volume holding the checkout and installed packages is deleted when the run ends, so only the saved fields above remain.

Output is saved as printed, so a command that prints something sensitive publishes it on the record. The code is public already, but check what your commands print before you run them.

## What UNSTUCK doesn't do with it

It doesn't post to GitHub or contact your reviewer. [What UNSTUCK won't do](/docs/limits) lists the rest, and [The study](/docs/study) explains how saved runs are counted.
