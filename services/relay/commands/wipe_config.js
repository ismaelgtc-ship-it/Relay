import { SlashCommandBuilder } from "discord.js";
import { fetchMirrorModule, saveMirrorConfig } from "./_mirrorStore.js";

export default {
  data: new SlashCommandBuilder().setName("wipe_config").setDescription("Resetea config mirror (groups vacío)"),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};
    await saveMirrorConfig({ active: true, config: { ...cfg, groups: [] } });
    await interaction.editReply({ content: "Config reseteada." });
  }
};
