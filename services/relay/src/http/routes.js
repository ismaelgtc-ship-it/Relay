import { URL } from "node:url";
import { env } from "../env.js";
import { getLatestSnapshot, saveSnapshot } from "../snapshot/store.js";
import { buildSnapshot } from "../snapshot.js";
import { getMongoDb } from "../db/mongo.js";
import { calendarService } from "../modules/calendar/service.js";
import { getCommand } from "../../commands/index.js";

function asPlainEmbed(e) {
  if (!e) return null;
  if (typeof e.toJSON === "function") return e.toJSON();
  if (typeof e === "object") return e;
  return { description: String(e) };
}

function createSyntheticInteraction({ name, options, client, guildId }) {
  const state = {
    deferred: false,
    replied: false,
    ephemeral: true,
    last: null
  };

  const opts = options && typeof options === "object" ? options : {};

  const resolver = {
    getString: (key, required = false) => {
      const v = opts?.[key];
      if ((v === undefined || v === null || v === "") && required) throw new Error(`Missing option: ${key}`);
      if (v === undefined || v === null) return null;
      return String(v);
    },
    getBoolean: (key, required = false) => {
      const v = opts?.[key];
      if (v === undefined || v === null) {
        if (required) throw new Error(`Missing option: ${key}`);
        return null;
      }
      return Boolean(v);
    },
    getInteger: (key, required = false) => {
      const v = opts?.[key];
      if (v === undefined || v === null || v === "") {
        if (required) throw new Error(`Missing option: ${key}`);
        return null;
      }
      const n = Number(v);
      if (!Number.isFinite(n)) throw new Error(`Invalid integer option: ${key}`);
      return Math.trunc(n);
    },
    getChannel: async (key, required = false) => {
      const v = opts?.[key];
      if ((v === undefined || v === null || v === "") && required) throw new Error(`Missing option: ${key}`);
      if (v === undefined || v === null || v === "") return null;
      const id = typeof v === "string" ? v : String(v?.id || "");
      if (!id) throw new Error(`Invalid channel option: ${key}`);
      if (!client) throw new Error("Discord client not ready");
      const channel = await client.channels.fetch(id).catch(() => null);
      if (!channel) {
        if (required) throw new Error(`Channel not found: ${id}`);
        return null;
      }
      return channel;
    },
    getUser: async (key, required = false) => {
      const v = opts?.[key];
      if ((v === undefined || v === null || v === "") && required) throw new Error(`Missing option: ${key}`);
      if (v === undefined || v === null || v === "") return null;
      const id = typeof v === "string" ? v : String(v?.id || "");
      if (!id) throw new Error(`Invalid user option: ${key}`);
      if (!client) throw new Error("Discord client not ready");
      const user = await client.users.fetch(id).catch(() => null);
      if (!user) {
        if (required) throw new Error(`User not found: ${id}`);
        return null;
      }
      return user;
    },
    getRole: async (key, required = false) => {
      const v = opts?.[key];
      if ((v === undefined || v === null || v === "") && required) throw new Error(`Missing option: ${key}`);
      if (v === undefined || v === null || v === "") return null;
      const id = typeof v === "string" ? v : String(v?.id || "");
      if (!id) throw new Error(`Invalid role option: ${key}`);
      if (!client) throw new Error("Discord client not ready");
      const gid = guildId || env.GUILD_ID;
      if (!gid) throw new Error("Missing guildId");
      const guild = client.guilds.cache.get(gid) ?? (await client.guilds.fetch(gid).catch(() => null));
      if (!guild) throw new Error("Guild not found");
      await guild.roles.fetch().catch(() => null);
      const role = guild.roles.cache.get(id) || null;
      if (!role) {
        if (required) throw new Error(`Role not found: ${id}`);
        return null;
      }
      return role;
    }
  };

  function normalizePayload(p) {
    const payload = p && typeof p === "object" ? { ...p } : { content: String(p ?? "") };
    if (Array.isArray(payload.embeds)) payload.embeds = payload.embeds.map(asPlainEmbed).filter(Boolean);
    return payload;
  }

  const interaction = {
    commandName: name,
    guildId: guildId || env.GUILD_ID || null,
    user: { id: "dashboard", tag: "dashboard" },
    member: null,
    channelId: null,
    deferred: false,
    replied: false,
    options: {
      getString: resolver.getString,
      getBoolean: resolver.getBoolean,
      getInteger: resolver.getInteger,
      getChannel: (key, required) => resolver.getChannel(key, required),
      getUser: (key, required) => resolver.getUser(key, required),
      getRole: (key, required) => resolver.getRole(key, required)
    },
    async deferReply({ ephemeral } = {}) {
      state.deferred = true;
      interaction.deferred = true;
      state.ephemeral = ephemeral !== undefined ? Boolean(ephemeral) : true;
      return;
    },
    async reply(payload) {
      state.replied = true;
      interaction.replied = true;
      state.last = normalizePayload(payload);
      return;
    },
    async editReply(payload) {
      state.replied = true;
      interaction.replied = true;
      state.last = normalizePayload(payload);
      return;
    },
    async followUp(payload) {
      state.last = normalizePayload(payload);
      return;
    }
  };

  return { interaction, getState: () => state };
}

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

      if (pathname === "/health") {
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

        const channels = guild.channels.cache
          .filter((c) => c && c.isTextBased())
          .map((c) => ({ id: c.id, name: c.name, type: c.type, parentId: c.parentId ?? null, position: c.rawPosition ?? 0 }))
          .sort((a, b) => a.position - b.position);

        const roles = guild.roles.cache
          .map((r) => ({ id: r.id, name: r.name, position: r.position, color: r.color, managed: r.managed }))
          .sort((a, b) => b.position - a.position);

        // Members can be heavy; limit
        const max = env.DASHBOARD_MAX_MEMBERS ?? 2000;
        await guild.members.fetch({ limit: max }).catch(() => null);
        const members = guild.members.cache
          .map((m) => ({ id: m.id, tag: m.user?.tag ?? m.id, nickname: m.nickname ?? null, roles: m.roles.cache.map((r) => r.id) }))
          .slice(0, max);

        return json(res, 200, { ok: true, guild: { id: guild.id, name: guild.name }, channels, roles, members });
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

      // Command execution (Dashboard -> Relay)
      // Body: { name: "create_group", options: { ... }, guildId?: "..." }
      if (pathname === "/api/dashboard/commands/execute" && req.method === "POST") {
        if (!dashboardOk(req)) return json(res, 401, { error: "unauthorized" });
        if (!client) return json(res, 503, { error: "discord not ready" });

        const body = await readBody(req);
        const name = String(body?.name || "").trim();
        const guildId = String(body?.guildId || env.GUILD_ID || "").trim();
        const options = body?.options && typeof body.options === "object" ? body.options : {};

        if (!name) return json(res, 400, { ok: false, error: "missing command name" });

        const cmd = getCommand(name);
        if (!cmd || typeof cmd.execute !== "function") return json(res, 404, { ok: false, error: "unknown command" });

        const { interaction, getState } = createSyntheticInteraction({ name, options, client, guildId });

        try {
          // Execute using the same handler used by Discord interactions.
          await cmd.execute(interaction);
          const st = getState();
          return json(res, 200, { ok: true, command: name, response: st.last || null, meta: { deferred: st.deferred, replied: st.replied, ephemeral: st.ephemeral } });
        } catch (err) {
          console.error("[dashboard] command execute failed", { name, err });
          const msg = String(err?.message || err);
          const st = getState();
          return json(res, 400, { ok: false, error: "command_failed", message: msg, command: name, response: st.last || null });
        }
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
