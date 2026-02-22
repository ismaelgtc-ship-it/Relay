FROM node:20-alpine

# Render setup (per-service Docker build context):
# - Root Directory: services/relay
# - Dockerfile Path: services/relay/Dockerfile
# - Docker Build Context Directory: services/relay

WORKDIR /app

# Install production deps for the relay service
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm i --omit=dev; fi

# Copy runtime sources (do not copy node_modules)
COPY src ./src
COPY commands ./commands
COPY interactions ./interactions
COPY index.js ./index.js

ENV NODE_ENV=production
CMD ["node", "src/index.js"]
