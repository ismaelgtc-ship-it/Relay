import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import { loadCommands } from "./commands/index.js";
import { handleInteraction } from "./interactions/handler.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

client.once("ready", async () => {
  console.log(`[relay] Logged in as ${client.user.tag}`);

  const commands = loadCommands();

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log("[relay] Slash commands registered.");
  } catch (err) {
    console.error("Command registration error:", err);
  }
});

client.on("interactionCreate", async (interaction) => {
  await handleInteraction(interaction);
});

client.login(TOKEN);
