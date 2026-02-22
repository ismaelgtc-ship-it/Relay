FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY package.json ./
RUN yarn install --production --non-interactive --network-timeout 600000

COPY src ./src

CMD ["node", "src/server.js"]
