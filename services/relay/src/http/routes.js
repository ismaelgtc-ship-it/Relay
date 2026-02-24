import { URL } from "node:url";
import { env } from "../env.js";
import { getLatestSnapshot, saveSnapshot } from "../snapshot/store.js";
import { buildSnapshot } from "../snapshot.js";
import { getMongoDb } from "../db/mongo.js";
import { calendarService } from "../modules/calendar/service.js";

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

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function headerKey(req) {
  const v = req.headers["x-api-key"];
  return Array.isArray(v) ? v[0] : (v || "");
}

function dashboardOk(req) {
  if (!env.DASHBOARD_API_KEY) return false;
  return headerKey(req) === env.DASHBOARD_API_KEY;
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
export function createRoutes({ getClient }) {
  return async function routes(req, res) {
    try {
      const u = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const { pathname } = u;
      const client = typeof getClient === "function" ? getClient() : null;

      if (pathname === "/health" || pathname === "/healthz") {
        return json(res, 200, { status: "ok", service: "relay", version: env.SERVICE_VERSION });
      }
      // Dashboard API (Warroom -> Relay)
      if (pathname === "/api/dashboard/guilds" && req.method === "GET") {
        if (!dashboardOk(req)) return json(res, 401, { error: "unauthorized" });
        const guilds = client ? client.guilds.cache.map((g) => ({ id: g.id, name: g.name })) : [];
        return json(res, 200, { ok: true, guilds });
      }

      if (pathname === "/api/dashboard/guild/state" && req.method === "GET") {
        if (!dashboardOk(req)) return json(res, 401, { error: "unauthorized" });
        if (!client) return json(res, 503, { error: "discord not ready" });

        const guildId = u.searchParams.get("guildId") || env.GUILD_ID;
        const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId).catch(() => null));
        if (!guild) return json(res, 404, { error: "guild not found" });

        await guild.channels.fetch().catch(() => null);
        await guild.roles.fetch().catch(() => null);

        // Full channel map (categories + text/voice/forum/etc)
        const channels = guild.channels.cache
          .filter((c) => !!c)
          .map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            parentId: c.parentId ?? null,
            position: c.rawPosition ?? 0,
            nsfw: !!c.nsfw,
            topic: "topic" in c ? (c.topic ?? null) : null,
            rateLimitPerUser: "rateLimitPerUser" in c ? (c.rateLimitPerUser ?? null) : null,
            permissionOverwrites: Array.from(c.permissionOverwrites?.cache?.values?.() || []).map((ow) => ({
              id: ow.id,
              type: ow.type,
              allow: ow.allow?.bitfield?.toString?.() ?? String(ow.allow ?? "0"),
              deny: ow.deny?.bitfield?.toString?.() ?? String(ow.deny ?? "0")
            }))
          }))
          .sort((a, b) => a.position - b.position);

        const roles = guild.roles.cache
          .map((r) => ({
            id: r.id,
            name: r.name,
            position: r.position,
            color: r.color,
            managed: r.managed,
            hoist: r.hoist,
            mentionable: r.mentionable,
            permissions: r.permissions?.bitfield?.toString?.() ?? String(r.permissions ?? "0")
          }))
          .sort((a, b) => b.position - a.position);

        // Members can be heavy; limit
        const max = env.DASHBOARD_MAX_MEMBERS ?? 2000;
        await guild.members.fetch({ limit: max }).catch(() => null);
        const members = guild.members.cache
          .map((m) => ({ id: m.id, tag: m.user?.tag ?? m.id, nickname: m.nickname ?? null, roles: m.roles.cache.map((r) => r.id) }))
          .slice(0, max);

        return json(res, 200, { ok: true, guild: { id: guild.id, name: guild.name }, channels, roles, members });
      }

      // --- Admin CRUD (Dashboard -> Relay) ---
      // Create a category
      if (pathname === "/api/dashboard/category/create" && req.method === "POST") {
        if (!dashboardOk(req)) return json(res, 401, { error: "unauthorized" });
        if (!client) return json(res, 503, { error: "discord not ready" });
        const body = await readBody(req);
        const guildId = String(body?.guildId || env.GUILD_ID || "");
        const name = String(body?.name || "").trim();
        if (!guildId || !name) return json(res, 400, { error: "bad request" });
        const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId).catch(() => null));
        if (!guild) return json(res, 404, { error: "guild not found" });
        const created = await guild.channels.create({ name, type: 4 }).catch((e) => ({ __err: e }));
        if (created?.__err) return json(res, 400, { error: "discord_error", detail: String(created.__err?.message || created.__err) });
        return json(res, 200, { ok: true, id: created.id, name: created.name });
      }

      // Create a text channel under a category (or root)
      if (pathname === "/api/dashboard/channel/create" && req.method === "POST") {
        if (!dashboardOk(req)) return json(res, 401, { error: "unauthorized" });
        if (!client) return json(res, 503, { error: "discord not ready" });
        const body = await readBody(req);
        const guildId = String(body?.guildId || env.GUILD_ID || "");
        const name = String(body?.name || "").trim();
        const parentId = body?.parentId ? String(body.parentId) : null;
        if (!guildId || !name) return json(res, 400, { error: "bad request" });
        const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId).catch(() => null));
        if (!guild) return json(res, 404, { error: "guild not found" });
        const created = await guild.channels.create({ name, type: 0, parent: parentId || undefined }).catch((e) => ({ __err: e }));
        if (created?.__err) return json(res, 400, { error: "discord_error", detail: String(created.__err?.message || created.__err) });
        return json(res, 200, { ok: true, id: created.id, name: created.name, parentId: created.parentId ?? null });
      }

      // Move channel to a category (or root)
      if (pathname === "/api/dashboard/channel/move" && req.method === "POST") {
        if (!dashboardOk(req)) return json(res, 401, { error: "unauthorized" });
        if (!client) return json(res, 503, { error: "discord not ready" });
        const body = await readBody(req);
        const channelId = String(body?.channelId || "");
        const parentId = body?.parentId ? String(body.parentId) : null;
        if (!channelId) return json(res, 400, { error: "bad request" });
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) return json(res, 404, { error: "channel not found" });
        const updated = await channel.setParent(parentId || null).catch((e) => ({ __err: e }));
        if (updated?.__err) return json(res, 400, { error: "discord_error", detail: String(updated.__err?.message || updated.__err) });
        return json(res, 200, { ok: true });
      }

      // Delete channel
      if (pathname === "/api/dashboard/channel/delete" && req.method === "POST") {
        if (!dashboardOk(req)) return json(res, 401, { error: "unauthorized" });
        if (!client) return json(res, 503, { error: "discord not ready" });
        const body = await readBody(req);
        const channelId = String(body?.channelId || "");
        if (!channelId) return json(res, 400, { error: "bad request" });
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) return json(res, 404, { error: "channel not found" });
        const out = await channel.delete().catch((e) => ({ __err: e }));
        if (out?.__err) return json(res, 400, { error: "discord_error", detail: String(out.__err?.message || out.__err) });
        return json(res, 200, { ok: true });
      }

      // Create role
      if (pathname === "/api/dashboard/role/create" && req.method === "POST") {
        if (!dashboardOk(req)) return json(res, 401, { error: "unauthorized" });
        if (!client) return json(res, 503, { error: "discord not ready" });
        const body = await readBody(req);
        const guildId = String(body?.guildId || env.GUILD_ID || "");
        const name = String(body?.name || "").trim();
        if (!guildId || !name) return json(res, 400, { error: "bad request" });
        const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId).catch(() => null));
        if (!guild) return json(res, 404, { error: "guild not found" });
        const created = await guild.roles.create({ name }).catch((e) => ({ __err: e }));
        if (created?.__err) return json(res, 400, { error: "discord_error", detail: String(created.__err?.message || created.__err) });
        return json(res, 200, { ok: true, id: created.id, name: created.name });
      }

      // Delete role
      if (pathname === "/api/dashboard/role/delete" && req.method === "POST") {
        if (!dashboardOk(req)) return json(res, 401, { error: "unauthorized" });
        if (!client) return json(res, 503, { error: "discord not ready" });
        const body = await readBody(req);
        const guildId = String(body?.guildId || env.GUILD_ID || "");
        const roleId = String(body?.roleId || "");
        if (!guildId || !roleId) return json(res, 400, { error: "bad request" });
        const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId).catch(() => null));
        if (!guild) return json(res, 404, { error: "guild not found" });
        const role = guild.roles.cache.get(roleId) ?? (await guild.roles.fetch(roleId).catch(() => null));
        if (!role) return json(res, 404, { error: "role not found" });
        const out = await role.delete().catch((e) => ({ __err: e }));
        if (out?.__err) return json(res, 400, { error: "discord_error", detail: String(out.__err?.message || out.__err) });
        return json(res, 200, { ok: true });
      }

      // Assign role to member
      if (pathname === "/api/dashboard/member/role/add" && req.method === "POST") {
        if (!dashboardOk(req)) return json(res, 401, { error: "unauthorized" });
        if (!client) return json(res, 503, { error: "discord not ready" });
        const body = await readBody(req);
        const guildId = String(body?.guildId || env.GUILD_ID || "");
        const userId = String(body?.userId || "");
        const roleId = String(body?.roleId || "");
        if (!guildId || !userId || !roleId) return json(res, 400, { error: "bad request" });
        const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId).catch(() => null));
        if (!guild) return json(res, 404, { error: "guild not found" });
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return json(res, 404, { error: "member not found" });
        const out = await member.roles.add(roleId).catch((e) => ({ __err: e }));
        if (out?.__err) return json(res, 400, { error: "discord_error", detail: String(out.__err?.message || out.__err) });
        return json(res, 200, { ok: true });
      }

      if (pathname === "/api/dashboard/channel/rename" && req.method === "POST") {
        if (!dashboardOk(req)) return json(res, 401, { error: "unauthorized" });
        if (!client) return json(res, 503, { error: "discord not ready" });
        const body = await readBody(req);
        const channelId = String(body?.channelId || "");
        const name = String(body?.name || "").trim();
        if (!channelId || !name) return json(res, 400, { error: "bad request" });

        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) return json(res, 404, { error: "channel not found" });

        await channel.setName(name).catch((e) => {
          throw e;
        });
        return json(res, 200, { ok: true });
      }

      if (pathname === "/api/dashboard/member/role/remove" && req.method === "POST") {
        if (!dashboardOk(req)) return json(res, 401, { error: "unauthorized" });
        if (!client) return json(res, 503, { error: "discord not ready" });
        const body = await readBody(req);
        const guildId = String(body?.guildId || env.GUILD_ID || "");
        const userId = String(body?.userId || "");
        const roleId = String(body?.roleId || "");
        if (!guildId || !userId || !roleId) return json(res, 400, { error: "bad request" });
        const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId).catch(() => null));
        if (!guild) return json(res, 404, { error: "guild not found" });
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return json(res, 404, { error: "member not found" });
        await member.roles.remove(roleId).catch((e) => { throw e; });
        return json(res, 200, { ok: true });
      }

      // Calendar (Dashboard)
      if (pathname === "/api/dashboard/calendar/events" && req.method === "GET") {
        if (!dashboardOk(req)) return json(res, 401, { error: "unauthorized" });
        const out = await calendarService.listEvents();
        return json(res, 200, out);
      }

      if (pathname === "/api/dashboard/calendar/forceSync" && req.method === "POST") {
        if (!dashboardOk(req)) return json(res, 401, { error: "unauthorized" });
        const out = await calendarService.forceSync();
        return json(res, 200, out);
      }

      if (pathname === "/api/dashboard/calendar/polls" && req.method === "GET") {
        if (!dashboardOk(req)) return json(res, 401, { error: "unauthorized" });
        const out = await calendarService.getPolls();
        return json(res, 200, out);
      }

      if (pathname === "/api/dashboard/calendar/poll/create" && req.method === "POST") {
        if (!dashboardOk(req)) return json(res, 401, { error: "unauthorized" });
        const body = await readBody(req);
        const out = await calendarService.createPollEvent(body);
        return json(res, out.ok ? 200 : 400, out);
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
