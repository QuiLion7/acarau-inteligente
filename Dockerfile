# deps -> build -> runtime (TechSpec §2). O build baixa a fonte do Google (rede).
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Só o necessário para scripts/migrar.mjs, nas versões do package-lock: o
# standalone do Next não traz o migrador do drizzle nem o `pg` completo.
FROM node:22-alpine AS migrador
WORKDIR /migrador
COPY package-lock.json ./
RUN set -e; \
    PG="$(node -p "require('./package-lock.json').packages['node_modules/pg'].version")"; \
    DRIZZLE="$(node -p "require('./package-lock.json').packages['node_modules/drizzle-orm'].version")"; \
    npm init -y > /dev/null; \
    npm install --no-audit --no-fund --save-exact "pg@${PG}" "drizzle-orm@${DRIZZLE}"

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# O node resolve `pg` e `drizzle-orm` a partir de scripts/node_modules.
COPY --from=migrador --chown=node:node /migrador/node_modules ./scripts/node_modules
COPY --chown=node:node scripts/migrar.mjs ./scripts/migrar.mjs
COPY --chown=node:node db/migracoes ./db/migracoes
# Dataset de exemplo que o servidor grava na subida (RF-02.41); o caminho parte de /app (PR-13).
COPY --chown=node:node dados/sinteticos/saude-pre-carregado_DEMO.csv ./dados/sinteticos/saude-pre-carregado_DEMO.csv
COPY --chown=node:node --chmod=755 docker/entrypoint.sh ./docker/entrypoint.sh
USER node
EXPOSE 3000
ENTRYPOINT ["./docker/entrypoint.sh"]
