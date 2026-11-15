# Security

## Reporting a problem

Please don't open a public issue for a security problem. Use GitHub's private vulnerability reporting on this repo (Security tab, "Report a vulnerability") and include the steps to reproduce it. You'll get a reply as soon as someone can look at it. This is a hackathon project with no bug bounty.

## What's worth looking at

- Reruns. `packages/replay` runs commands that a user typed against a public repo they picked. Each step runs in its own throwaway Docker container, and every check after the checkout step runs with `--network none`. The worker in [deploy/compose.yml](deploy/compose.yml) mounts the host's Docker socket so it can start those containers, so anything that lets a check reach the worker or the socket matters.
- Thread reads. UNSTUCK reads public GitHub threads and checks each picked ask against GitHub again before saving it. Anything that lets a saved ask differ from what the reviewer wrote matters.
- Agent Market. Owners sign in with Agent Market's OAuth device-code flow, and UNSTUCK keeps their tokens sealed with AES-256-GCM under `MARKET_TOKEN_KEY`. A hire checks the owner's spending limit and prepares a job on Agent Market's MCP server, and the owner pays on Agent Market's own checkout page. No UNSTUCK call moves money, so anything that reads or misuses a stored token, gets around the spending limit, or sends an owner to a checkout page they didn't ask for matters.

## Secrets

Secrets live in `.env` locally and in `deploy/secrets/`, `deploy/web.env` and `deploy/worker.env` on the server. All of them are gitignored. If you find a secret committed anywhere in the history, report it the same way.
