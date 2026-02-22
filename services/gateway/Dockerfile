FROM node:20-alpine

# Render setup (per-service Docker build context):
# - Root Directory: services/gateway
# - Dockerfile Path: services/gateway/Dockerfile
# - Docker Build Context Directory: services/gateway

WORKDIR /app

# Install production deps for the gateway service
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm i --omit=dev; fi

# Copy runtime sources (do not copy node_modules)
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/server.js"]
