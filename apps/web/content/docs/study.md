The study is the set of public grant milestone reviews that have been rerun with UNSTUCK, counted at [/study](/study). Its question is what still fails on the commit a reviewer looked at.

Every number on that page is read from the stored runs when you open it, so the counts here would go stale. This page explains how they're made and how to read them.

## How a review is counted

The same five steps apply to every review, in this order.

1. Find a review that holds a payment. These are public GitHub threads where a program's reviewer left open items on a milestone delivery. So far that's Canton Dev Fund issues and Web3 Foundation delivery pull requests.
2. Pin the commit the reviewer saw. That's the latest commit on the code repo at the time of the comment, or the pull request's head when the code lives in the thread itself. Never today's main.
3. Take the asks word for word. Each ask is a sentence from the reviewer's comment, stored with its position and checked against GitHub again before it's saved.
4. Rerun in a [container](/docs/glossary#container). A fresh clone at that commit, network off for the checks, read-only filesystem, and capped CPU, memory and time. Every exit code and an output hash is stored.
5. Tag each ask from its exit codes. The rule is on [Asks and tags](/docs/asks-and-tags#how-a-tag-is-decided).

## What's counted

- Each reviewer comment is counted once. Opening the same comment again adds a run, not a review, and the review's verdicts come from its latest finished rerun.
- Every check that ran is counted in the step totals, repeats included, because each one really executed.

## What's left out

- Runs that couldn't start. A failed checkout is an error and never turns an ask into Still missing.
- The grantee's own delivery notes. Only comments from the program's reviewers are read as asks.
- Threads already approved or paid, since nothing is left to close on them.
- Private repos and closed code. If a reviewer could only check it privately, so can't anyone else.

## Reading the counts

The page shows asks still missing out of all asks, a split of Still missing, Works and Not sure, a list of reviews, and the runs underneath. Each figure keeps its denominator, and every review links to the [run record](/docs/run-records) behind it.

- Below ten reviews the page shows an "Early count" note. Read the numbers as counts and not as rates for every program.
- The reviews are the threads someone chose to run. It isn't a random sample of grants, so it says little about how often reviewers are right or how often grantees miss asks.
- Still missing means a check failed on the reviewed commit. The checks were chosen by whoever set up the run, so a count of Still missing depends on those choices.
- The page also reports a median time from the reviewer's comment to the first finished rerun, for reviews with a dated comment, and the median time per check.

Reviews are labelled by program when their thread repo is one UNSTUCK knows: Canton Dev Fund, Web3 Foundation Grants and Filecoin Dev Grants. Any other repo shows under its own name.

## Adding to it

A review you run through [/start](/start) is counted in the study, once per reviewer comment. If you'd rather it didn't appear, UNSTUCK can't unlist it. [What it reads and saves](/docs/data) says what is public.
