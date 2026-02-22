import { Client, GatewayIntentBits, Events } from "discord.js";
import http from "node:http";
import { env } from "./env.js";
import { gatewayRegister, gatewayHeartbeat } from "./gatewayClient.js";

/**
 * Render (Free) Web Service health checks require an HTTP listener.
 * Keep it lightweight and always-on.
 */
const server = http.createServer((req, res) => {
  const url = req.url ?? "/";
  if (url === "/healthz" || url === "/") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "relay" }));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ status: "not_found" }));
});

server.listen(env.PORT, "0.0.0.0", () => {
  console.log(`[relay] health server listening on :${env.PORT}`);
});

/**
 * Intents:
 * - Default is SAFE (Guilds only) to avoid "Used disallowed intents".
 * - Enable extras via env flags.
 */
const intents = [GatewayIntentBits.Guilds];

if (env.ENABLE_GUILD_MESSAGES) intents.push(GatewayIntentBits.GuildMessages);
if (env.ENABLE_MESSAGE_CONTENT) intents.push(GatewayIntentBits.MessageContent);

const client = new Client({ intents });

client.once(Events.ClientReady, async () => {
  console.log(`[relay] logged in as ${client.user?.tag ?? "unknown"}`);

  const hasGateway = Boolean(env.GATEWAY_URL) && Boolean(env.INTERNAL_API_KEY);

  if (!hasGateway) {
    console.log("[relay] gateway disabled (no GATEWAY_URL / INTERNAL_API_KEY)");
    return;
  }

  // Never crash the process due to gateway connectivity issues.
  try {
    await gatewayRegister();
    console.log("[relay] gateway registered");
  } catch (err) {
    console.error("[relay] gateway register failed (continuing without gateway):", err);
    return;
  }

  setInterval(() => {
    gatewayHeartbeat()
      .then(() => console.log("[relay] gateway heartbeat ok"))
      .catch((err) => console.error("[relay] gateway heartbeat error", err));
  }, 30_000);
});

client.login(env.DISCORD_TOKEN).catch((err) => {
  console.error("[relay] discord login failed:", err);
  process.exitCode = 1;
});
