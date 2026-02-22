# Render-optimized, deterministic, and resilient install
# - Uses npm ci with package-lock.json
# - Upgrades npm to avoid known npm 10.x intermittent "Exit handler never called!" failures
# - Multi-stage to keep runtime image small

FROM node:20-slim AS deps
WORKDIR /app
ENV NODE_ENV=production \
    npm_config_update_notifier=false \
    npm_config_audit=false \
    npm_config_fund=false

# Upgrade npm (Render often ships older npm in base image)
RUN npm i -g npm@11.10.1 --no-audit --no-fund

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
  && node -e "import('express').then(()=>process.exit(0)).catch((e)=>{console.error(e);process.exit(1)})"

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only what is needed at runtime
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY src ./src

CMD ["node", "src/server.js"]
