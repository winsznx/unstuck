FROM node:22-alpine
RUN apk add --no-cache docker-cli && corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/replay/package.json packages/replay/
COPY packages/integrations/package.json packages/integrations/
RUN pnpm install --frozen-lockfile --filter @unstuck/worker... --filter @unstuck/db...
COPY packages packages
COPY apps/worker apps/worker
ENV NODE_ENV=production
CMD ["sh", "-c", "export DATABASE_URL=postgres://unstuck:$(cat /run/secrets/db_password)@db:5432/unstuck && pnpm --filter @unstuck/db migrate && exec pnpm --filter @unstuck/worker start"]
