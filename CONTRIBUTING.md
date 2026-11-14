# Contributing

Issues and pull requests are welcome. For anything bigger than a small fix, open an issue first so we can agree on the shape before you write it.

## Setup

Follow "Run it locally" in the [README](README.md). You need Node 22+, pnpm 12 and Docker.

## Before you open a pull request

```sh
pnpm typecheck
pnpm vitest run
pnpm --filter @unstuck/web lint
```

If you touched the UI, also run these. Both exit 1 on a failure.

```sh
pnpm --filter @unstuck/web contrast
pnpm --filter @unstuck/web guardrails
```

## How the code is laid out

- `apps/web` is the Next.js site. Docs pages are Markdown in `apps/web/content/docs`, listed in reading order in `apps/web/lib/docs/manifest.ts`.
- `apps/worker` runs queued reruns.
- `packages/core`, `db`, `pipeline`, `replay` and `integrations` are shared code. The README's architecture section says what each one does.

## Rules the code follows

- UI follows [docs/DESIGN.md](docs/DESIGN.md). Colors come from the tokens in `apps/web/app/tokens.css`, never raw values.
- The product never claims more than it does. Anything not live is written in the future tense and marked as not built or locked. If you ship one of those parts, update the status table in the README, `apps/web/content/docs/introduction.md` and `apps/web/components/landing/fix.tsx` together.
- Checks run with the network off. Don't add a code path that turns it on for a check.
- No secrets in the repo. Use `.env`, which is gitignored, and add new variables to `.env.example` with a comment.

## License

By contributing you agree that your work is released under the [MIT License](LICENSE).
