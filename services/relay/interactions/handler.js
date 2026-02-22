import { commandRegistry } from "../commands/index.js";

export async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const command = commandRegistry.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error("Command execution error:", error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: "Error executing command.", ephemeral: true });
    } else {
      await interaction.reply({ content: "Error executing command.", ephemeral: true });
    }
  }
}
