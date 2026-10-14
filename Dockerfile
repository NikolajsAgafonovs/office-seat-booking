# Production image (decision 0009): builds client and server, serves both from Fastify.
# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV CI=true
# Prisma detects the OpenSSL version at `prisma generate`; without the library it guesses wrong.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
# Dependency manifests first so the install layer caches.
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
# Prisma client generation (server postinstall) needs the schema.
COPY server/prisma server/prisma
RUN npm ci --no-audit --no-fund
COPY tsconfig.base.json ./
COPY shared shared
COPY server server
COPY client client
COPY docs/floor-plan.json docs/floor-plan.json
COPY docs/fixtures docs/fixtures
RUN npm run build -w server && npm run build -w client

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# OpenSSL is required by the Prisma engines.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
# Full dependency tree: the Prisma CLI runs migrations at start (decision 0009).
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/shared/package.json shared/
COPY --from=build /app/server/package.json server/
COPY --from=build /app/server/prisma server/prisma
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist
COPY --from=build /app/docs docs
COPY deploy/start.sh start.sh
RUN chmod +x start.sh && mkdir -p /data
EXPOSE 3000
CMD ["./start.sh"]
