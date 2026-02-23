import { SlashCommandBuilder } from "discord.js";
import { fetchMirrorModule, saveMirrorConfig } from "./_mirrorStore.js";

export default {
  data: new SlashCommandBuilder()
    .setName("load_config")
    .setDescription("Carga config mirror desde JSON (string)")
    .addStringOption((o) => o.setName("json").setDescription("JSON de configuración").setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const raw = interaction.options.getString("json", true);
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return interaction.editReply({ content: "JSON inválido." }); }
    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};
    const res = await saveMirrorConfig({ active: true, config: { ...cfg, ...parsed } });
    if (!res.ok) return interaction.editReply({ content: "No se pudo guardar." });
    await interaction.editReply({ content: "Config cargada correctamente." });
  }
};
