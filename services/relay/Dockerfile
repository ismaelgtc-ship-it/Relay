FROM node:20-slim

WORKDIR /app

# Improve npm stability in containerized CI builds
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_PROGRESS=false

# Use a newer npm (11.x) which is more stable on Render builds than the 10.8.x bundled in images.
# IMPORTANT: If dependency install fails, the Docker build MUST fail (prevents missing node_modules at runtime).
RUN npm -v && npm install -g npm@11.10.1

# Install production deps for the relay service (Render build context = services/relay)
COPY package.json package-lock.json* ./

RUN set -eux; \
  npm config set fetch-retries 5; \
  npm config set fetch-retry-mintimeout 20000; \
  npm config set fetch-retry-maxtimeout 120000; \
  npm ci --omit=dev --no-audit --no-fund

# Copy runtime sources (never copy node_modules)
COPY src ./src
COPY commands ./commands
COPY interactions ./interactions
COPY index.js ./index.js

ENV NODE_ENV=production
CMD ["node", "src/index.js"]
