Plain definitions of the words you'll meet in UNSTUCK and in these docs, from A to Z. Tag names are written the way the site shows them.

## Agent Market

NEAR Agent Market at market.near.ai, where agents list work and are paid. UNSTUCK reads its public listings today. Hiring through it is off. See [Hiring a fix](/docs/get-it-fixed).

## Ask

One sentence from your reviewer's comment that you picked as something they want done. It's stored word for word with its position in the comment. See [Asks and tags](/docs/asks-and-tags).

## Check

A shell command tied to one ask. It runs on the reviewed commit with the network off, and its [exit code](/docs/glossary#exit-code) decides the ask's tag. See [Checks and reruns](/docs/checks).

## Container

Where each step runs: a fresh volume, a read-only root, dropped capabilities, capped CPU, memory and processes, a time limit, and no network for the checks. See [Checks and reruns](/docs/checks#the-container).

## Exit code

The number a command ends with. 0 means success and anything else means failure. A check that runs out of time has no exit code and counts as failed.

## Fixed

A tag for an ask that was Still missing on the reviewed commit and whose check exits 0 once a fix is applied. The fix can be yours or an agent's. See [Asks and tags](/docs/asks-and-tags#fixed).

## Image

The container image a run's steps execute in, such as `node:22-bookworm-slim`. You choose it from a short list, and UNSTUCK preselects one from your repo's files. See [Checks and reruns](/docs/checks#the-container).

## Install step

A command that runs once before the checks, with the network on, to fetch the packages they need. If it fails, no check runs and every ask is Not sure. See [Checks and reruns](/docs/checks#the-install-step).

## MCP

Model Context Protocol, the way agents and tools like Claude Code call outside services. UNSTUCK runs an MCP server at `https://unstuck-near.vercel.app/mcp` with four tools. See [Call UNSTUCK from an agent](/docs/agents#the-mcp-tools).

## Milestone

In UNSTUCK, one reviewer comment you started a run on, with its page at `/m/<id>`. In a grant program it's the delivery your reviewer is assessing.

## NEAR AI Cloud

NEAR's hosted model service. UNSTUCK sends it the sentences of your reviewer's comment and gets back which ones are asks, with a reason for each. See [Asks and tags](/docs/asks-and-tags#what-counts-as-an-ask).

## Not sure

A tag for an ask with no check, or whose check never ran. It means nothing was tested. See [Asks and tags](/docs/asks-and-tags#not-sure).

## Open

A tag for an ask that no finished run has judged yet. See [Asks and tags](/docs/asks-and-tags#open).

## Output hash

The SHA-256 of everything a step printed, stored with the number of bytes. The record keeps only the last 64 KB of the text, and the hash covers all of it. See [Run records](/docs/run-records#reading-a-step).

## Reviewed commit

The last commit before your reviewer's comment, which every run checks. Later pushes to your branch don't change it. See [Checks and reruns](/docs/checks#the-commit).

## Run record

The public page saved for every run, at `/runs/<id>`, with its commit, every command, exit codes, output and a script to rerun it. See [Run records](/docs/run-records).

## Spending limit

A planned ceiling on what UNSTUCK may pay for one hire and for all of them. It can't be saved today. See [Hiring a fix](/docs/get-it-fixed#spending-limit).

## Still missing

A tag for an ask whose check failed or ran out of time on the reviewed commit. See [Asks and tags](/docs/asks-and-tags#still-missing).

## Study

The set of public grant milestone reviews rerun with UNSTUCK, counted at [/study](/study). See [The study](/docs/study).

## Tag

The label an ask gets from a run: Works, Still missing or Not sure, plus Open before a run finishes and Fixed once a fix makes a Still missing ask pass. See [Asks and tags](/docs/asks-and-tags#the-tags).

## Works

A tag for an ask whose checks all exited 0 on the reviewed commit. See [Asks and tags](/docs/asks-and-tags#works).
