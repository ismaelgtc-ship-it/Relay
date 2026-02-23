import { Client, GatewayIntentBits, Events, REST, Routes } from "discord.js";
import { env } from "./env.js";
import { commands, getCommand } from "../commands/index.js";
import { gatewayRegister, gatewayHeartbeat, gatewayGetModule } from "./gatewayClient.js";
import { createMirrorRuntime } from "./modules/mirror.js";
import { startHttpServer } from "./http/server.js";
import { calendarService } from "./modules/calendar/service.js";

const mirror = createMirrorRuntime();

// HTTP server (health, dashboard API, snapshot API)
startHttpServer({ client: null });

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions]
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

  // Start HTTP routes with live client
  startHttpServer({ client });

  // Register slash commands
  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
  const slash = commands
    .filter((c) => c && c.data && typeof c.data.name === "string")
    .map((c) => (typeof c.data.toJSON === "function" ? c.data.toJSON() : c.data));
  await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID), { body: slash });

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

  // Calendar sync (optional)
  await calendarService.init({ client }).catch((e) => console.error("[calendar] init failed", e));
});

client.on(Events.InteractionCreate, async (interaction) => {
  // Calendar buttons (interest / polls)
  const calHandled = await calendarService.handleInteraction(interaction).catch(() => false);
  if (calHandled) return;

  // Chat input commands
  if (interaction.isChatInputCommand()) {
    const command = getCommand(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction, { client, mirror });
    } catch (err) {
      console.error("[relay] command error", err);
      const msg = "Error executing command.";
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: msg, ephemeral: true }).catch(() => null);
      } else {
        await interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
      }
    }
    return;
  }

  // Context menu
  if (interaction.isContextMenuCommand()) {
    const command = getCommand(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction, { client, mirror });
    } catch (err) {
      console.error("[relay] context error", err);
      await interaction.reply({ content: "Error.", ephemeral: true }).catch(() => null);
    }
    return;
  }

  // Buttons / selects / modals handled by commands that expose `handleComponent`
  const handler = getCommand("select_language") || null;
  const any = commands.find((c) => typeof c.handleComponent === "function");
  for (const c of commands) {
    if (typeof c.handleComponent !== "function") continue;
    try {
      const handled = await c.handleComponent(interaction, { client, mirror });
      if (handled) return;
    } catch (err) {
      console.error("[relay] component handler error", err);
    }
  }
});

client.login(env.DISCORD_TOKEN);
