# syntax=docker/dockerfile:1.7
#
# Production image for the Stockholm Medhanealem website (Next.js standalone server + Payload).
#
#   runner  (default) slim image that serves the site; applies DB migrations on startup
#   tools             full source + dependencies for one-off commands on the server, e.g.
#                     `docker compose -f docker-compose.prod.yml run --rm tools pnpm seed:base`
#
# NEXT_PUBLIC_SERVER_URL is compiled into the client bundle, so it is a build argument.

ARG NODE_VERSION=22-alpine

# ── Dependencies ──────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
RUN apk add --no-cache libc6-compat && corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────────────────
FROM deps AS builder
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL} \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production
COPY . .
# The Payload config validates its env vars when imported. The build never connects to the database
# or storage, so placeholders are enough; they exist only in this build stage, not in the runner.
RUN test -n "$NEXT_PUBLIC_SERVER_URL" || (echo "Build arg NEXT_PUBLIC_SERVER_URL is required" && exit 1) && \
    PAYLOAD_SECRET=build-placeholder \
    MFA_ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000 \
    DATABASE_URI=postgres://build:build@127.0.0.1:5432/build \
    S3_ENDPOINT=http://127.0.0.1:9000 S3_REGION=build S3_BUCKET=build \
    S3_ACCESS_KEY_ID=build S3_SECRET_ACCESS_KEY=build \
    pnpm build

# ── Tools (one-off commands: migrate, seed, create admin, reset MFA) ──────
FROM builder AS tools
ENV NODE_ENV=production
ENTRYPOINT ["pnpm"]
CMD ["payload", "migrate:status"]

# ── Runtime ───────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    TZ=Europe/Stockholm \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# public/ is currently empty; keep the directory so adding files later needs no Dockerfile change.
RUN mkdir -p public && chown nextjs:nodejs public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "server.js"]
