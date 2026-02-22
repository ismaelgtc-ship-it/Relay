import { Client, GatewayIntentBits, Partials, Events } from "discord.js";
import { env } from "./env.js";
import { gatewayRegister, gatewayHeartbeat } from "./gatewayClient.js";
import { startHttpServer } from "./http/server.js";
import { startSnapshotLoop } from "./snapshot/runner.js";

console.log("[relay] boot", { version: env.SERVICE_VERSION });

const intents = [GatewayIntentBits.Guilds];
if (env.ENABLE_GUILD_MESSAGES) intents.push(GatewayIntentBits.GuildMessages);
if (env.ENABLE_MESSAGE_CONTENT) intents.push(GatewayIntentBits.MessageContent);

const client = new Client({
  intents,
  partials: [Partials.Channel]
});

// Always start HTTP server (health + optional snapshot API)
startHttpServer({ client });

client.once(Events.ClientReady, async () => {
  console.log("[relay] ready", { user: client.user?.tag });

  // Optional: periodic snapshots for Overseer to pull
  startSnapshotLoop({ client });

  // Optional: register with gateway (Overseer)
  const canGateway = Boolean(env.GATEWAY_URL) && Boolean(env.INTERNAL_API_KEY);
  if (!canGateway) {
    console.log("[relay] gateway disabled (no GATEWAY_URL / INTERNAL_API_KEY)");
    return;
  }

  const ok = await gatewayRegister({ url: env.GATEWAY_URL, apiKey: env.INTERNAL_API_KEY });
  console.log("[relay] gatewayRegister", { ok });

  setInterval(() => {
    gatewayHeartbeat({ url: env.GATEWAY_URL, apiKey: env.INTERNAL_API_KEY }).catch(() => {});
  }, 30_000);
});

client.login(env.DISCORD_TOKEN);
