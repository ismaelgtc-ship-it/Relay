FROM node:20-slim

WORKDIR /app

# Render has shown intermittent npm (10/11) failures during long dependency installs
# ("Exit handler never called!"), causing incomplete node_modules and runtime crashes.
# Definitive mitigation: use Yarn (via Corepack) with node-modules linker.

ENV NODE_ENV=production \
    YARN_NODE_LINKER=node-modules \
    YARN_ENABLE_IMMUTABLE_INSTALLS=false \
    YARN_ENABLE_GLOBAL_CACHE=true

RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# Install production deps for the relay service (Render build context = services/relay)
COPY package.json ./
RUN yarn install --production --inline-builds

# Copy runtime sources (never copy node_modules)
COPY src ./src
COPY commands ./commands
COPY interactions ./interactions
COPY index.js ./index.js

CMD ["node", "src/index.js"]
