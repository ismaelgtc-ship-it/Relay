FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

# Deterministic, production-only install (Render-safe)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
  && node --input-type=module -e "import('express'); import('helmet'); import('morgan'); console.log('deps ok')"

COPY src ./src

CMD ["node", "src/server.js"]
