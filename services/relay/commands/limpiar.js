import { SlashCommandBuilder } from "discord.js";
import { fetchMirrorModule, saveMirrorConfig, formatMirrorSaveError } from "./_mirrorStore.js";

export default {
  data: new SlashCommandBuilder().setName("mirror_clear").setDescription("🧹 Clear Mirror configuration (groups)"),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};

    const res = await saveMirrorConfig({ active: true, config: { ...cfg, groups: [] } });
    if (!res.ok) {
      console.error("[mirror] mirror_clear save failed", { statusCode: res.statusCode, data: res.data });
      return interaction.editReply({ content: `Failed to save mirror configuration. ${formatMirrorSaveError(res)}` });
    }

    return interaction.editReply({ content: "Mirror configuration cleared." });
  }
};
