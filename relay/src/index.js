import { Client, GatewayIntentBits } from "discord.js";
import { env } from "./env.js";
import { gatewayRegister, gatewayHeartbeat } from "./gatewayClient.js";

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
