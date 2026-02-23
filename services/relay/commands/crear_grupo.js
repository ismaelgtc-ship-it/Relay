import { SlashCommandBuilder } from "discord.js";
import { fetchMirrorModule, saveMirrorConfig, normalizeGroups, formatMirrorSaveError } from "./_mirrorStore.js";

export default {
  data: new SlashCommandBuilder()
    .setName("create_group")
    .setDescription("🪞 Create a Mirror group")
    .addStringOption((o) => o.setName("name").setDescription("Group name").setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const name = interaction.options.getString("name", true).trim();
    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};
    const groups = normalizeGroups(cfg);

    if (groups.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
      return interaction.editReply({ content: "A group with that name already exists." });
    }

    groups.push({ name, channels: {} });
    const res = await saveMirrorConfig({ active: true, config: { ...cfg, groups } });

    if (!res.ok) {
      console.error("[mirror] create_group save failed", { statusCode: res.statusCode, data: res.data });
      return interaction.editReply({ content: `Failed to save mirror configuration. ${formatMirrorSaveError(res)}` });
    }

    return interaction.editReply({ content: `Group created: **${name}**` });
  }
};
