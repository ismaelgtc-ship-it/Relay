FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production

# npm has shown intermittent failures in Render builds ("Exit handler never called!").
# Use Yarn Classic via Corepack for stable production installs.
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# Install only production dependencies. If yarn.lock exists, enforce it.
COPY package.json yarn.lock* ./
RUN (yarn install --production --frozen-lockfile --non-interactive --network-timeout 600000) \
 || (yarn install --production --non-interactive --network-timeout 600000)

COPY src ./src
COPY commands ./commands
COPY interactions ./interactions
COPY index.js ./index.js

CMD ["node", "src/index.js"]
