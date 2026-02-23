import { SlashCommandBuilder } from "discord.js";
import { fetchMirrorModule, saveMirrorConfig, formatMirrorSaveError } from "./_mirrorStore.js";

export default {
  data: new SlashCommandBuilder()
    .setName("mirror_import")
    .setDescription("📥 Import Mirror config from JSON (string)")
    .addStringOption((o) => o.setName("json").setDescription("Configuration JSON").setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const raw = interaction.options.getString("json", true);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return interaction.editReply({ content: "Invalid JSON." });
    }

    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};

    const res = await saveMirrorConfig({ active: true, config: { ...cfg, ...parsed } });
    if (!res.ok) {
      console.error("[mirror] mirror_import save failed", { statusCode: res.statusCode, data: res.data });
      return interaction.editReply({ content: `Failed to save mirror configuration. ${formatMirrorSaveError(res)}` });
    }

    return interaction.editReply({ content: "Config imported." });
  }
};
