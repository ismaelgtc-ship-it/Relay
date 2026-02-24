import { Client, GatewayIntentBits, Events, REST, Routes } from "discord.js";
import http from "node:http";
import { commands, getCommand } from "./commands/index.js";

const PORT = Number(process.env.PORT ?? 10000);
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!DISCORD_TOKEN) throw new Error("Missing env: DISCORD_TOKEN");
if (!CLIENT_ID) throw new Error("Missing env: CLIENT_ID");
if (!GUILD_ID) throw new Error("Missing env: GUILD_ID");

// Render Web Service health checks require an HTTP listener.
// Warroom (Cloudflare Pages) calls /health, so we expose both /health and /healthz.
const server = http.createServer((req, res) => {
  const url = req.url ?? "/";

  // Basic CORS so Warroom can fetch from the browser.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, X-API-Key"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if ((req.method ?? "GET").toUpperCase() === "OPTIONS") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (url === "/health" || url === "/healthz" || url === "/") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "relay" }));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ status: "not_found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[relay] health server listening on :${PORT}`);
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, async () => {
  console.log(`[relay] logged in as ${client.user?.tag ?? "unknown"}`);

  // Register slash commands (guild-scoped for fast propagation)
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands.map((c) => c.data)
  });

  console.log("[relay] slash commands registered");
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
      await interaction.reply({ content: "Error ejecutando comando.", ephemeral: true });
    }
  }
});

client.login(DISCORD_TOKEN);
