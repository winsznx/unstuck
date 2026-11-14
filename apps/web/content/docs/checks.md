A check is a shell command tied to one ask. It runs on the reviewed commit, inside a container with the network off, and its exit code decides the tag.

## What a check is

Exit 0 means the ask is met. Any other exit code, or running out of time, marks the ask [Still missing](/docs/glossary#still-missing). The command runs through `sh -lc` inside the repo folder at the reviewed commit, and `CI=true` is set.

A check only tests what its command looks at. A command that looks for a docs site config can't see a site hosted somewhere else. UNSTUCK doesn't judge whether a command fits the ask, and the run record puts each command beside the words it checks so your reviewer can.

## Suggested checks

For each ask UNSTUCK suggests up to three commands, in this order:

1. Commands your reviewer wrote in the comment, in code fences or inline code, when they start with a known tool such as `npm`, `pnpm`, `yarn`, `cargo`, `go`, `python`, `pytest`, `make`, `forge`, `anchor` or `just`.
2. Commands matched from keywords in the ask: tests, builds, lint, README, docs, hosted docs, deployed docs, CI workflows, license, Docker and examples.
3. If nothing matches, your repo's test command.

Suggestions come from what's in the repo at that commit. A Node project with a `test` script gets that script. Docs and file checks use `ls`, `test` and `grep`, and print an `error:` line when they fail. You can edit any suggestion or write your own.

## The install step

The install runs once, before the checks, with the network on. It is the only step besides the checkout that can reach the network. The checks that follow find the installed packages in the same working volume, so builds and tests can run offline.

If the install fails or times out, the run stops there. No check runs, and every ask is [Not sure](/docs/glossary#not-sure).

## The commit

A run uses the last commit before the review, so its record shows what your reviewer saw. Later pushes to your branch don't change it. That is why a record can show what was missing and can't yet show a fix: checking a change on top of the reviewed commit comes with [hiring](/docs/get-it-fixed), which is off.

## The container

| Setting | Value |
| --- | --- |
| Checkout | A shallow fetch of exactly that commit into an empty volume, network on |
| Install | Network on, 15 minutes |
| Each check | Network off, 10 minutes |
| CPU and memory | 2 CPUs and 3 GB per step by default, with swap equal to memory |
| Processes | At most 512 |
| Filesystem | Read-only root, with a scratch `/tmp` of up to 1 GB |
| Privileges | All Linux capabilities dropped, no privilege escalation |
| Home | `/work/.home`, inside the run's own volume |

Every step runs in its own container, which is removed afterwards. The volume is deleted when the run ends. No accounts, tokens or secrets are passed in.

You choose one of these container images, and UNSTUCK preselects one from the repo's files:

| Image | Chosen when the repo has |
| --- | --- |
| `node:22-bookworm-slim` | A `package.json` |
| `rust:1.84-slim` | A `Cargo.toml`. The `wasm32` target isn't included |
| `golang:1.23-bookworm` | A `go.mod` |
| `python:3.12-slim` | A `pyproject.toml`, `requirements.txt` or `setup.py` |
| `alpine:3.20` | None of those. Checks can still look at files |

## Reruns

Each time you press Run, UNSTUCK queues a new run. It never changes an old one. Opening the same comment again adds a run, and the [study](/docs/study) counts the review once. UNSTUCK doesn't rerun automatically when you push. Rerunning on an agent's change is [not built yet](/docs/get-it-fixed).
