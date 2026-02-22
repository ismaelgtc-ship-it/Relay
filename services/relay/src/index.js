import http from "node:http";
import { Client, GatewayIntentBits, Events, REST, Routes } from "discord.js";
import { env } from "./env.js";
import { commands, getCommand } from "../commands/index.js";
import { gatewayRegister, gatewayHeartbeat, gatewayGetModule } from "./gatewayClient.js";
import { createMirrorRuntime } from "./modules/mirror.js";
import { buildGuildSnapshot } from "./snapshot.js";

const mirror = createMirrorRuntime();

// Render health checks require an HTTP listener.
const server = http.createServer(async (req, res) => {
  const url = req.url ?? "/";

  if (url === "/" || url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "relay", ts: new Date().toISOString() }));
    return;
  }

  if (url === "/internal/snapshot") {
    const secret = req.headers["x-relay-secret"];
    if (!secret || secret !== env.SNAPSHOT_API_KEY) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }));
      return;
    }

    const guild = client.guilds.cache.get(env.GUILD_ID) ?? (await client.guilds.fetch(env.GUILD_ID).catch(() => null));
    if (!guild) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "GUILD_NOT_FOUND" }));
      return;
    }

    await guild.roles.fetch().catch(() => null);
    await guild.channels.fetch().catch(() => null);

    const snapshot = await buildGuildSnapshot(guild);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, snapshot }));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "NOT_FOUND" }));
});

server.listen(env.PORT, "0.0.0.0", () => {
  console.log(`[relay] http listening on :${env.PORT}`);
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

async function refreshModules() {
  const { statusCode, data } = await gatewayGetModule({
    gatewayUrl: env.GATEWAY_URL,
    internalKey: env.INTERNAL_API_KEY,
    name: "mirror"
  });

  if (statusCode === 200 && data?.ok) {
    mirror.setState({ active: data.active, locked: data.locked, config: data.config });
  }
}

client.once(Events.ClientReady, async () => {
  console.log(`[relay] logged in as ${client.user?.tag ?? "unknown"}`);

  // Presence
  try {
    // discord.js v14: setPresence is synchronous and does not return a Promise
    client.user?.setPresence({
      activities: [{ name: "Relaying translations • Live Service" }],
      status: "online"
    });
  } catch {
    // ignore presence failures
  }

  // Register in Gateway
  await gatewayRegister({
    gatewayUrl: env.GATEWAY_URL,
    internalKey: env.INTERNAL_API_KEY,
    service: "realtime",
    version: "1.0.0",
    meta: { slug: "relay" }
  }).catch((e) => console.error("[relay] gateway register failed", e));

  // Register slash commands (only non-control commands allowed)
  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID), {
    body: commands.map((c) => c.data)
  });

  console.log("[relay] slash commands registered");

  // Start heartbeats
  setInterval(() => {
    gatewayHeartbeat({
      gatewayUrl: env.GATEWAY_URL,
      internalKey: env.INTERNAL_API_KEY,
      service: "realtime"
    }).catch(() => null);
  }, 30_000);

  // Module refresh loop
  await refreshModules().catch(() => null);
  setInterval(() => refreshModules().catch(() => null), 10_000);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = getCommand(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error("[relay] command error", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Command error.", ephemeral: true });
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  await mirror.onMessage(message);
});

client.login(env.DISCORD_TOKEN);
