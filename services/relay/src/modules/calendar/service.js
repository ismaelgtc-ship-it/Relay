import { google } from "googleapis";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import crypto from "node:crypto";
import { env } from "../../env.js";
import { getMongoDb } from "../../db/mongo.js";

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function decodeServiceAccount(raw) {
  if (!raw) return null;
  const direct = safeJsonParse(raw);
  if (direct && typeof direct === "object") return direct;
  try {
    const buf = Buffer.from(raw, "base64").toString("utf-8");
    return safeJsonParse(buf);
  } catch {
    return null;
  }
}

function extractJsonBlock(description, marker) {
  if (!description) return null;
  const idx = description.indexOf(marker);
  if (idx === -1) return null;
  const after = description.slice(idx + marker.length);
  // Try fenced code blocks first
  const fence = after.match(/```(?:json|devilwolf)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) {
    const parsed = safeJsonParse(fence[1].trim());
    if (parsed) return parsed;
  }
  // Fallback: find first JSON object by brace matching
  const start = after.indexOf("{");
  if (start === -1) return null;
  const s = after.slice(start);
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth === 0) {
      const candidate = s.slice(0, i + 1);
      return safeJsonParse(candidate.trim());
    }
  }
  return null;
}

function toUnix(ts) {
  const d = new Date(ts);
  const n = Math.floor(d.getTime() / 1000);
  return Number.isFinite(n) ? n : null;
}

function buildCountdownFields(startIso) {
  const u = toUnix(startIso);
  if (!u) return [];
  return [
    { name: "Empieza", value: `<t:${u}:F>`, inline: true },
    { name: "Cuenta atrás", value: `<t:${u}:R>`, inline: true }
  ];
}

function baseEmbedFromJson(embedJson) {
  const raw = embedJson?.embeds?.[0] || embedJson;
  if (!raw || typeof raw !== "object") return null;
  return new EmbedBuilder(raw);
}

function interestRow(eventId, count) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`cal_interest:${eventId}`)
      .setLabel(`Me interesa (${count})`)
      .setStyle(ButtonStyle.Primary)
  );
}

function pollRows(eventId, poll, counts) {
  const rows = [];
  const opts = Array.isArray(poll?.options) ? poll.options.slice(0, 10) : [];
  for (let i = 0; i < opts.length; i += 5) {
    const row = new ActionRowBuilder();
    for (let j = i; j < Math.min(i + 5, opts.length); j++) {
      const opt = String(opts[j]);
      const c = counts?.[opt] ?? 0;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`cal_poll:${eventId}:${crypto.createHash("sha1").update(opt).digest("hex").slice(0, 8)}`)
          .setLabel(`${opt} (${c})`)
          .setStyle(ButtonStyle.Secondary)
      );
    }
    rows.push(row);
  }
  return rows;
}

export class CalendarService {
  constructor() {
    this.client = null;
    this.calendar = null;
    this.db = null;
    this.timer = null;
    this.cache = { events: [], updatedAt: null };
    this.optMap = new Map(); // eventId -> Map(hash->option)
  }

  get enabled() {
    return Boolean(
      env.GOOGLE_CALENDAR_ID &&
      env.GOOGLE_SERVICE_ACCOUNT_JSON &&
      env.CALENDAR_ANNOUNCE_CHANNEL_ID &&
      env.MONGO_URI
    );
  }

  async init({ client }) {
    this.client = client;
    if (!this.enabled) {
      console.log("[calendar] module disabled (missing env or mongo)");
      return;
    }

    const sa = decodeServiceAccount(env.GOOGLE_SERVICE_ACCOUNT_JSON);
    if (!sa?.client_email || !sa?.private_key) {
      console.error("[calendar] invalid service account JSON");
      return;
    }

    const auth = new google.auth.JWT({
      email: sa.client_email,
      key: sa.private_key,
      scopes: ["https://www.googleapis.com/auth/calendar"]
    });
    this.calendar = google.calendar({ version: "v3", auth });
    this.db = await getMongoDb(env.MONGO_URI);

    await this.sync().catch((e) => console.error("[calendar] initial sync failed", e));
    const every = (env.CALENDAR_POLL_INTERVAL_SEC ?? 60) * 1000;
    this.timer = setInterval(() => this.sync().catch(() => null), every);
    console.log(`[calendar] sync enabled every ${every / 1000}s`);
  }

  async forceSync() {
    if (!this.enabled) return { ok: false, error: "disabled" };
    await this.sync();
    return { ok: true };
  }

  async listEvents() {
    return { ok: true, updatedAt: this.cache.updatedAt, events: this.cache.events };
  }

  async getPolls() {
    if (!this.db) return { ok: false, error: "disabled" };
    const col = this.db.collection("calendar_polls");
    const docs = await col.find({}).sort({ updatedAt: -1 }).limit(50).toArray();
    return {
      ok: true,
      polls: docs.map((d) => ({
        eventId: d.eventId,
        title: d.title,
        startsAt: d.startsAt,
        options: d.options,
        counts: d.counts,
        totalVotes: d.totalVotes,
        updatedAt: d.updatedAt
      }))
    };
  }

  async createPollEvent(payload) {
    if (!this.enabled) return { ok: false, error: "disabled" };
    const { title, startIso, endIso, embedJson, options } = payload || {};
    if (!title || !startIso || !endIso || !Array.isArray(options) || options.length < 2) {
      return { ok: false, error: "bad_request" };
    }

    const poll = { type: "poll", options: options.map((o) => String(o)).slice(0, 10) };
    const desc = [
      "DEVILWOLF_EMBED_JSON:\n```json\n" + JSON.stringify(embedJson || {}, null, 2) + "\n```",
      "DEVILWOLF_POLL_JSON:\n```json\n" + JSON.stringify(poll, null, 2) + "\n```"
    ].join("\n\n");

    const created = await this.calendar.events.insert({
      calendarId: env.GOOGLE_CALENDAR_ID,
      requestBody: {
        summary: title,
        description: desc,
        start: { dateTime: startIso, timeZone: env.CALENDAR_TIMEZONE },
        end: { dateTime: endIso, timeZone: env.CALENDAR_TIMEZONE }
      }
    });

    const eventId = created?.data?.id;
    if (!eventId) return { ok: false, error: "create_failed" };
    await this.sync().catch(() => null);
    return { ok: true, eventId };
  }

  async sync() {
    if (!this.enabled || !this.calendar) return;
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + (env.CALENDAR_LOOKAHEAD_DAYS ?? 30) * 86400000).toISOString();

    const r = await this.calendar.events.list({
      calendarId: env.GOOGLE_CALENDAR_ID,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50
    });

    const items = Array.isArray(r?.data?.items) ? r.data.items : [];
    const events = [];

    for (const e of items) {
      const eventId = e.id;
      if (!eventId) continue;
      const startsAt = e.start?.dateTime || (e.start?.date ? `${e.start.date}T00:00:00.000Z` : null);
      if (!startsAt) continue;
      const embedJson = extractJsonBlock(e.description || "", "DEVILWOLF_EMBED_JSON");
      if (!embedJson) continue;
      const pollJson = extractJsonBlock(e.description || "", "DEVILWOLF_POLL_JSON");

      events.push({
        eventId,
        title: e.summary || "(sin título)",
        startsAt,
        endsAt: e.end?.dateTime || null,
        hasPoll: Boolean(pollJson),
        updated: e.updated || null
      });

      await this.ensureAnnounced({
        eventId,
        title: e.summary || "(sin título)",
        startsAt,
        embedJson,
        pollJson
      });
    }

    this.cache.events = events;
    this.cache.updatedAt = new Date().toISOString();
  }

  async ensureAnnounced({ eventId, title, startsAt, embedJson, pollJson }) {
    if (!this.db || !this.client) return;
    const posts = this.db.collection("calendar_posts");
    const interests = this.db.collection("calendar_interests");
    const pollCol = this.db.collection("calendar_polls");

    const existing = await posts.findOne({ eventId });
    const channel = await this.client.channels.fetch(env.CALENDAR_ANNOUNCE_CHANNEL_ID).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const interestedCount = await interests.countDocuments({ eventId });

    const embed = baseEmbedFromJson(embedJson) || new EmbedBuilder().setTitle(title);
    const fields = buildCountdownFields(startsAt);
    if (fields.length) embed.addFields(fields);

    // Poll setup
    let poll = null;
    let pollCounts = null;
    if (pollJson && Array.isArray(pollJson.options)) {
      poll = { options: pollJson.options.map((o) => String(o)).slice(0, 10) };
      const doc = await pollCol.findOne({ eventId });
      if (!doc) {
        await pollCol.insertOne({
          eventId,
          title,
          startsAt,
          options: poll.options,
          counts: Object.fromEntries(poll.options.map((o) => [o, 0])),
          totalVotes: 0,
          updatedAt: new Date().toISOString(),
          votes: {}
        });
      }
      const latest = await pollCol.findOne({ eventId });
      pollCounts = latest?.counts || Object.fromEntries(poll.options.map((o) => [o, 0]));
      const map = new Map();
      for (const opt of poll.options) {
        map.set(crypto.createHash("sha1").update(opt).digest("hex").slice(0, 8), opt);
      }
      this.optMap.set(eventId, map);
    }

    const components = [];
    if (poll) components.push(...pollRows(eventId, poll, pollCounts));
    components.push(interestRow(eventId, interestedCount));

    if (existing?.messageId) {
      const msg = await channel.messages.fetch(existing.messageId).catch(() => null);
      if (msg) {
        await msg.edit({ embeds: [embed], components }).catch(() => null);
        return;
      }
    }

    const sent = await channel.send({ embeds: [embed], components }).catch(() => null);
    if (!sent) return;
    await posts.updateOne(
      { eventId },
      { $set: { eventId, messageId: sent.id, channelId: channel.id, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
  }

  async handleInteraction(interaction) {
    if (!this.enabled || !this.db) return false;
    if (!interaction.isButton()) return false;

    const id = interaction.customId || "";

    if (id.startsWith("cal_interest:")) {
      const eventId = id.split(":")[1];
      if (!eventId) return false;
      const interests = this.db.collection("calendar_interests");
      const key = { eventId, userId: interaction.user.id };
      const existed = await interests.findOne(key);
      if (existed) await interests.deleteOne(key);
      else await interests.insertOne({ ...key, createdAt: new Date().toISOString() });
      await interaction.reply({ content: existed ? "Quitado de Me interesa." : "Marcado como Me interesa.", ephemeral: true }).catch(() => null);
      await this.sync().catch(() => null);
      return true;
    }

    if (id.startsWith("cal_poll:")) {
      const parts = id.split(":");
      const eventId = parts[1];
      const hash = parts[2];
      const opt = this.optMap.get(eventId)?.get(hash);
      if (!eventId || !opt) return false;

      const pollCol = this.db.collection("calendar_polls");
      const doc = await pollCol.findOne({ eventId });
      if (!doc) {
        await interaction.reply({ content: "Encuesta no disponible.", ephemeral: true }).catch(() => null);
        return true;
      }

      const prev = doc.votes?.[interaction.user.id] || null;
      const votes = Object.assign({}, doc.votes || {});
      votes[interaction.user.id] = opt;

      const counts = Object.fromEntries(doc.options.map((o) => [o, 0]));
      for (const v of Object.values(votes)) {
        if (counts[v] !== undefined) counts[v] += 1;
      }
      const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0);
      await pollCol.updateOne({ eventId }, { $set: { votes, counts, totalVotes, updatedAt: new Date().toISOString() } });
      await interaction.reply({ content: prev ? `Voto actualizado: ${opt}` : `Votado: ${opt}`, ephemeral: true }).catch(() => null);
      await this.sync().catch(() => null);
      return true;
    }

    return false;
  }
}

export const calendarService = new CalendarService();
