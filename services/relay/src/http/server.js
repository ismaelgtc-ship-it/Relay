import http from "node:http";
import { env } from "../env.js";
import { createRoutes } from "./routes.js";

let server = null;
let currentClient = null;

export function setHttpClient(client) {
  currentClient = client;
}

/**
 * Starts the HTTP server.
 * Always exposes /health. Snapshot endpoints are gated by SNAPSHOT_API_KEY.
 */
export function startHttpServer({ client }) {
  if (client) currentClient = client;
  if (server) return server;

  const routes = createRoutes({ getClient: () => currentClient });
  server = http.createServer(routes);

  server.listen(env.PORT, () => {
    console.log(`[relay] http listening on :${env.PORT}`);
  });

  return server;
}

// Compatibility export (some earlier iterations imported `createServer`).
export function createServer({ client }) {
  return startHttpServer({ client });
}
