import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { fetchMirrorModule, normalizeGroups } from "./_mirrorStore.js";

export default {
  data: new SlashCommandBuilder().setName("mirror_list").setDescription("📋 List Mirror groups and channels"),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};
    const groups = normalizeGroups(cfg);
    if (!groups.length) return interaction.editReply({ content: "No groups found." });

    const embed = new EmbedBuilder().setTitle("Mirror • Groups");
    for (const g of groups) {
      const lines = Object.entries(g.channels || {}).map(([id, lang]) => `• <#${id}> — \`${lang}\``);
      embed.addFields({ name: g.name, value: lines.length ? lines.join("\n") : "_(no channels)_", inline: false });
    }
    await interaction.editReply({ embeds: [embed] });
  }
};
