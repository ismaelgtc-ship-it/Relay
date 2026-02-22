import { URL } from "node:url";
import { env } from "../env.js";
import { getLatestSnapshot, saveSnapshot } from "../snapshot/store.js";
import { buildSnapshot } from "../snapshot.js";
import { getMongoDb } from "../db/mongo.js";

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

function text(res, status, body) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(body);
}

function getKey(u) {
  return u.searchParams.get("key") || "";
}

function keyOk(u) {
  // If no key configured, disable protected endpoints.
  if (!env.SNAPSHOT_API_KEY) return false;
  return getKey(u) === env.SNAPSHOT_API_KEY;
}

/**
 * Creates a request handler bound to a Discord client instance.
 * The client is optional; snapshot endpoints that require it will return 503 if missing.
 */
export function createRoutes({ client }) {
  return async function routes(req, res) {
    try {
      const u = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const { pathname } = u;

      if (pathname === "/" || pathname === "/healthz" || pathname === "/health") {
        return json(res, 200, { ok: true, service: "relay", version: env.SERVICE_VERSION, ts: new Date().toISOString() });
      }

      // Internal snapshot (Overseer puller)
      if (pathname === "/internal/snapshot" && req.method === "GET") {
        const secret = req.headers["x-relay-secret"];
        if (!env.SNAPSHOT_API_KEY || typeof secret !== "string" || secret !== env.SNAPSHOT_API_KEY) {
          return json(res, 401, { ok: false, error: "UNAUTHORIZED" });
        }

        const guildId = u.searchParams.get("guildId") || env.GUILD_ID;
        if (!guildId) return json(res, 400, { ok: false, error: "BAD_REQUEST", detail: "missing guildId" });
        if (!client) return json(res, 503, { ok: false, error: "NOT_READY" });

        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return json(res, 404, { ok: false, error: "NOT_FOUND" });

        const snapshot = await buildSnapshot(guild);
        return json(res, 200, { ok: true, snapshot });
      }

      // Snapshot API (used by Overseer puller)
      if (pathname === "/api/snapshot/latest" && req.method === "GET") {
        if (!keyOk(u)) return json(res, 401, { error: "unauthorized" });

        const guildId = u.searchParams.get("guildId") || env.GUILD_ID;
        if (!guildId) return json(res, 400, { error: "missing guildId" });
        if (!env.MONGO_URI) return json(res, 503, { error: "mongo not configured" });

        const db = await getMongoDb(env.MONGO_URI);
        const snap = await getLatestSnapshot(db, { guildId });
        if (!snap) return json(res, 404, { error: "no snapshot" });

        return json(res, 200, snap);
      }

      // Force-take a snapshot and persist it (admin only)
      if (pathname === "/api/snapshot/take" && req.method === "POST") {
        if (!keyOk(u)) return json(res, 401, { error: "unauthorized" });

        const guildId = u.searchParams.get("guildId") || env.GUILD_ID;
        if (!guildId) return json(res, 400, { error: "missing guildId" });
        if (!env.MONGO_URI) return json(res, 503, { error: "mongo not configured" });
        if (!client) return json(res, 503, { error: "discord client not ready" });

        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return json(res, 404, { error: "guild not found" });

        const data = await buildSnapshot(guild);
        const takenAt = new Date().toISOString();
        const db = await getMongoDb(env.MONGO_URI);

        const saved = await saveSnapshot(db, { guildId, takenAt, data });
        return json(res, 200, { ok: true, guildId, takenAt: saved.takenAt });
      }

      return text(res, 404, "not found");
    } catch (err) {
      return json(res, 500, { error: "internal_error", detail: String(err?.message || err) });
    }
  };
}
