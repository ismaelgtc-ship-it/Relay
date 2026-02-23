import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder().setName("ping").setDescription("Health check"),
  async execute(interaction) {
    await interaction.reply({ content: "pong", ephemeral: true });
  }
};
