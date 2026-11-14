#!/bin/sh
# Runs the worker CLI inside the running worker container: deploy/cli.sh show <milestone-id>
set -eu
cd "$(dirname "$0")"
exec docker compose -f compose.yml exec -T worker sh -c \
  'export DATABASE_URL="postgres://unstuck:$(cat /run/secrets/db_password)@db:5432/unstuck" && cd apps/worker && exec node --import tsx src/cli.ts "$@"' cli "$@"
