FROM node:20-slim

WORKDIR /app

# Render has shown intermittent npm failures during long dependency installs
# ("Exit handler never called!"), causing incomplete node_modules and runtime crashes.
# We avoid npm during image build and use Yarn Classic (1.x), which is stable for
# production-only installs and does not require a lockfile.

ENV NODE_ENV=production

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
