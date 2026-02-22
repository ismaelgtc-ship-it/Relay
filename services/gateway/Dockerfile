FROM node:20-slim

WORKDIR /app

ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_PROGRESS=false

RUN npm -v && npm install -g npm@11.10.1

COPY package.json package-lock.json* ./

RUN set -eux; \
  npm config set fetch-retries 5; \
  npm config set fetch-retry-mintimeout 20000; \
  npm config set fetch-retry-maxtimeout 120000; \
  npm ci --omit=dev --no-audit --no-fund

COPY src ./src

ENV NODE_ENV=production
CMD ["node", "src/server.js"]
