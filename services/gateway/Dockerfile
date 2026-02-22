FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production \
    YARN_NODE_LINKER=node-modules \
    YARN_ENABLE_IMMUTABLE_INSTALLS=false \
    YARN_ENABLE_GLOBAL_CACHE=true

RUN corepack enable && corepack prepare yarn@4.6.0 --activate

COPY package.json ./
RUN yarn install --production --inline-builds

COPY src ./src

CMD ["node", "src/server.js"]
