FROM node:20-slim

WORKDIR /app

ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_PROGRESS=false

RUN npm -v && npm install -g npm@10.9.2

# Install production deps for the gateway service (Render build context = services/gateway)
COPY package.json package-lock.json* ./

RUN set -eux; \
  for i in 1 2 3; do \
    npm ci --omit=dev --no-audit --no-fund && break; \
    echo "npm ci failed (attempt $i/3)"; \
    npm cache clean --force || true; \
    sleep 3; \
  done

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/server.js"]
