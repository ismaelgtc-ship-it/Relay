FROM node:20-alpine

# IMPORTANT (Render Docker): builds often run with repo root as build context.
# This Dockerfile is written to work with build context = "." (repo root).

WORKDIR /app

# Install production deps for the gateway service
COPY services/gateway/package.json services/gateway/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm i --omit=dev; fi

# Copy only gateway sources + shared packages it imports
COPY services/gateway ./
COPY packages ./packages

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/server.js"]
