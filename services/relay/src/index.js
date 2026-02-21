import { Client, GatewayIntentBits } from "discord.js";
import http from "node:http";
import { env } from "./env.js";
import { gatewayRegister, gatewayHeartbeat } from "./gatewayClient.js";
import { buildGuildSnapshot } from "./snapshot.js";

// Render (Free) Web Service health checks require an HTTP listener.
const server = http.createServer(async (req, res) => {
  const url = req.url ?? "/";

  if (url === "/healthz" || url === "/") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "relay" }));
    return;
  }

  // --- INTERNAL: snapshot export (Overseer -> Relay) ---
  if (url === "/internal/snapshot" && req.method === "GET") {
    const secret = req.headers["x-relay-secret"];
    if (!env.RELAY_SECRET || secret !== env.RELAY_SECRET) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "unauthorized" }));
      return;
    }
    if (!env.GUILD_ID) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "bad_request", error: "GUILD_ID missing" }));
      return;
    }

    try {
      const snap = await buildGuildSnapshot(client, env.GUILD_ID);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok", snapshot: snap }));
      return;
    } catch (err) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "error", error: String(err?.message ?? err) }));
      return;
    }
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

client.once("clientReady", async () => {
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

  if (env.GUILD_ID) {
    console.log(`[relay] snapshot target guild: ${env.GUILD_ID}`);
  }
});

client.login(env.DISCORD_TOKEN);
