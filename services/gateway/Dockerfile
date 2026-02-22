FROM node:20-alpine

# IMPORTANT (Render Docker): build context is repo root (.) in our Render setup.
# We COPY only the files we need so we never overwrite node_modules.

WORKDIR /app

# Install production deps for the gateway service
COPY services/gateway/package.json services/gateway/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm i --omit=dev; fi

# Copy gateway runtime sources (do NOT copy the whole directory to avoid clobbering node_modules)
COPY services/gateway/src ./src

# Shared packages (manifest, etc.)
COPY packages ./packages

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/server.js"]
