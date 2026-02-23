import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { fetchMirrorModule, normalizeGroups } from "./_mirrorStore.js";

export default {
  data: new SlashCommandBuilder().setName("list").setDescription("Lista grupos y canales (mirror)"),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};
    const groups = normalizeGroups(cfg);
    if (!groups.length) return interaction.editReply({ content: "No hay grupos." });

    const embed = new EmbedBuilder().setTitle("Mirror • Grupos");
    for (const g of groups) {
      const lines = Object.entries(g.channels || {}).map(([id, lang]) => `• <#${id}> — \`${lang}\``);
      embed.addFields({ name: g.name, value: lines.length ? lines.join("\n") : "_(sin canales)_", inline: false });
    }
    await interaction.editReply({ embeds: [embed] });
  }
};
