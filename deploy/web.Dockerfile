FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/replay/package.json packages/replay/
COPY packages/integrations/package.json packages/integrations/
COPY packages/pipeline/package.json packages/pipeline/
RUN pnpm install --frozen-lockfile --filter @unstuck/web...
COPY packages packages
COPY apps/web apps/web
# Canonical URLs, the sitemap and llms.txt are written into static pages at build time.
ARG SITE_URL
ENV SITE_URL=$SITE_URL
RUN pnpm --filter @unstuck/web build

FROM node:22-alpine
WORKDIR /app
ARG SITE_URL
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 SITE_URL=$SITE_URL
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["sh", "-c", "export DATABASE_URL=postgres://unstuck:$(cat /run/secrets/db_password)@db:5432/unstuck && exec node apps/web/server.js"]
