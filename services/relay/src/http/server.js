import http from "node:http";
import { env } from "../env.js";
import { createRoutes } from "./routes.js";

/**
 * Starts the HTTP server.
 * Always exposes /health. Snapshot endpoints are gated by SNAPSHOT_API_KEY.
 */
export function startHttpServer({ client }) {
  const routes = createRoutes({ client });
  const server = http.createServer(routes);

  server.listen(env.PORT, () => {
    console.log(`[relay] health server listening on :${env.PORT}`);
  });

  return server;
}
