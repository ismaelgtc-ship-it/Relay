import { SlashCommandBuilder } from "discord.js";
import { fetchMirrorModule, saveMirrorConfig } from "./_mirrorStore.js";

export default {
  data: new SlashCommandBuilder().setName("limpiar").setDescription("Limpia configuración mirror (grupos)"),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};
    await saveMirrorConfig({ active: true, config: { ...cfg, groups: [] } });
    await interaction.editReply({ content: "Configuración mirror limpiada." });
  }
};
