FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

# Deterministic, production-only install (Render-safe)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
  && node --input-type=module -e "import('discord.js'); import('dotenv'); import('undici'); import('zod'); console.log('deps ok')"

# Copy runtime sources
COPY src ./src
COPY commands ./commands
COPY interactions ./interactions
COPY index.js ./index.js

CMD ["node", "src/index.js"]
