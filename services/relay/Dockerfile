FROM node:20-alpine

# IMPORTANT (Render Docker): builds often run with repo root as build context.
# This Dockerfile is written to work with build context = "." (repo root).

WORKDIR /app

# Install production deps for relay service
COPY services/relay/package.json services/relay/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm i --omit=dev; fi

# Copy relay sources + shared packages (if any)
COPY services/relay ./
COPY packages ./packages

ENV NODE_ENV=production
CMD ["node", "src/index.js"]
