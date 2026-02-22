FROM node:20-slim

WORKDIR /app

# Improve npm stability in containerized CI builds
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_PROGRESS=false

# Pin npm to a stable version (avoids sporadic "Exit handler never called!" issues)
RUN npm -v && npm install -g npm@10.9.2

# Install production deps for the relay service (Render build context = services/relay)
COPY package.json package-lock.json* ./

# Retry to handle transient registry/network hiccups
RUN set -eux; \
  for i in 1 2 3; do \
    npm ci --omit=dev --no-audit --no-fund && break; \
    echo "npm ci failed (attempt $i/3)"; \
    npm cache clean --force || true; \
    sleep 3; \
  done

# Copy runtime sources (never copy node_modules)
COPY src ./src
COPY commands ./commands
COPY interactions ./interactions
COPY index.js ./index.js

ENV NODE_ENV=production
CMD ["node", "src/index.js"]
