FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

# Deterministic installs for Render (use package-lock.json)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY src ./src

CMD ["node", "src/server.js"]
