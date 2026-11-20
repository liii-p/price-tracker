# syntax=docker/dockerfile:1

# ---- build: install everything, build the app, then drop dev-only packages ----
FROM node:24-bookworm-slim AS build
WORKDIR /app

# Build tools, in case better-sqlite3 has no prebuilt binary for this platform
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Only needed so the Prisma config can load during install/build; the real path is set at runtime
ENV DATABASE_URL="file:/tmp/build.db" \
    NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

# ---- runtime ----
FROM node:24-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    DATABASE_URL="file:/data/price-tracker.db" \
    PRISMA_HIDE_UPDATE_MESSAGE=true

COPY --from=build --chown=node:node /app ./
RUN mkdir -p /data && chown node:node /data && chmod +x docker-entrypoint.sh

USER node
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=1m --timeout=5s --start-period=30s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
