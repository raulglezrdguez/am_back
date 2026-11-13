# syntax=docker/dockerfile:1

FROM node:24.22.0-bookworm-slim AS base
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

# Dependencias completas (incluye devDependencies para compilar)
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Build: hereda node_modules con devDependencies; no reinstalar sin dev
FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY index.ts instrumentation.ts ./
COPY api ./api
COPY config ./config
COPY graphql ./graphql
COPY middlewares ./middlewares
COPY models ./models
COPY services ./services
COPY types ./types
RUN npm run build

# Solo dependencias de producción (copiar package.json ANTES de npm ci)
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && npm ci --omit=dev \
    && npm cache clean --force \
    && apt-get purge -y --auto-remove python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Runtime
FROM node:24.22.0-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NODE_OPTIONS=--enable-source-maps

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

USER node
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5050)+'/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

EXPOSE 5050 9464
# 9464 solo debe ser accesible desde el namespace de Prometheus.

CMD ["node", "--enable-source-maps", "--import", "./dist/instrumentation.js", "dist/index.js"]
