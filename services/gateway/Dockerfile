# syntax=docker/dockerfile:1

FROM node:20-slim AS deps
WORKDIR /app

# Deterministic, cache-friendly install
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
  && node -e "import('express').then(()=>process.exit(0)).catch(()=>process.exit(1))"

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only what is needed at runtime
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY src ./src

CMD ["node", "src/server.js"]
