import { Client, GatewayIntentBits } from "discord.js";
import http from "node:http";
import { env } from "./env.js";
import { gatewayRegister, gatewayHeartbeat } from "./gatewayClient.js";

// Render (Free) Web Service health checks require an HTTP listener.
// This endpoint is intentionally minimal and does not expose internals.
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

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once("ready", async () => {
  console.log(`[relay] logged in as ${client.user?.tag ?? "unknown"}`);

  await gatewayRegister();

  setInterval(() => {
    gatewayHeartbeat().catch((err) => console.error("[relay] heartbeat error", err));
  }, 30_000);
});

client.login(env.DISCORD_TOKEN);
