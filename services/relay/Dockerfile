FROM node:20-alpine

# IMPORTANT (Render Docker): build context is repo root (.) in our Render setup.
# Copy only what we need so we never overwrite node_modules.

WORKDIR /app

# Install production deps for relay service
COPY services/relay/package.json services/relay/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm i --omit=dev; fi

# Copy relay runtime sources (avoid copying node_modules from repo)
COPY services/relay/src ./src
COPY services/relay/commands ./commands
COPY services/relay/interactions ./interactions
COPY services/relay/index.js ./index.js

COPY packages ./packages

ENV NODE_ENV=production
CMD ["node", "src/index.js"]
