FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

# Deterministic installs for Render (use package-lock.json)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copy runtime sources
COPY src ./src
COPY commands ./commands
COPY interactions ./interactions
COPY index.js ./index.js

CMD ["node", "src/index.js"]
