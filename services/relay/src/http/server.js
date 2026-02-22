import http from "node:http";
import { env } from "../env.js";
import { createRoutes } from "./routes.js";

/**
 * HTTP server factory.
 * Kept as a named export for compatibility with entrypoints that import `createServer`.
 */
export function createServer({ client }) {
  const routes = createRoutes({ client });
  return http.createServer(routes);
}

/**
 * Starts the HTTP server.
 * Always exposes /health. Snapshot endpoints are gated by SNAPSHOT_API_KEY.
 */
export function startHttpServer({ client }) {
  const server = createServer({ client });

  // Render expects binding on 0.0.0.0
  server.listen(env.PORT, "0.0.0.0", () => {
    console.log(`[relay] health server listening on :${env.PORT}`);
  });

  return server;
}
