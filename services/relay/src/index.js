import { Client, GatewayIntentBits } from "discord.js";
import http from "node:http";
import { env } from "./env.js";
import { gatewayRegister, gatewayHeartbeat } from "./gatewayClient.js";

// Render (Free) Web Service health checks require an HTTP listener.
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

client.once("clientReady", () => {
  console.log(`[relay] logged in as ${client.user?.tag ?? "unknown"}`);

  const hasGateway = Boolean(env.GATEWAY_URL) && Boolean(env.INTERNAL_API_KEY);
  if (hasGateway) {
    await gatewayRegister();
    setInterval(() => {
      gatewayHeartbeat().catch((err) => console.error("[relay] heartbeat error", err));
    }, 30_000);
  } else {
    console.log("[relay] gateway disabled (no GATEWAY_URL / INTERNAL_API_KEY)");
  }
});

client.login(env.DISCORD_TOKEN);
