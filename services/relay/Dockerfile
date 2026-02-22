FROM node:20-slim

WORKDIR /app

# Render has shown intermittent npm (10/11) failures during long dependency installs
# ("Exit handler never called!"), causing incomplete node_modules and runtime crashes.
# Definitive mitigation: use Yarn Classic (via Corepack) with node_modules.

ENV NODE_ENV=production

# Yarn Berry (v2+) deprecates --production on install and can fail builds depending
# on config. We pin Yarn Classic for maximum compatibility and stability.
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# Install production deps for the relay service (Render build context = services/relay)
COPY package.json ./
RUN yarn install --production --non-interactive --network-timeout 600000

# Copy runtime sources (never copy node_modules)
COPY src ./src
COPY commands ./commands
COPY interactions ./interactions
COPY index.js ./index.js

CMD ["node", "src/index.js"]
