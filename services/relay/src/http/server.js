import http from "node:http";
import { env } from "../env.js";
import { createRoutes } from "./routes.js";

/**
 * Starts the HTTP server.
 * Always exposes /health. Snapshot endpoints are gated by SNAPSHOT_API_KEY.
 */
export function startHttpServer({ client }) {
  const server = createServer({ client });

  server.listen(env.PORT, () => {
    console.log(`[relay] health server listening on :${env.PORT}`);
  });

  return server;
}

/**
 * Backwards-compatible factory.
 * Some deployments import { createServer } from "./http/server.js".
 */
export function createServer({ client } = {}) {
  const routes = createRoutes({ client });
  return http.createServer(routes);
}
