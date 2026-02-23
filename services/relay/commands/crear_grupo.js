import { SlashCommandBuilder } from "discord.js";
import { fetchMirrorModule, saveMirrorConfig, normalizeGroups } from "./_mirrorStore.js";

export default {
  data: new SlashCommandBuilder()
    .setName("crear_grupo")
    .setDescription("Crea un grupo de espejo")
    .addStringOption((o) => o.setName("nombre").setDescription("Nombre del grupo").setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const name = interaction.options.getString("nombre", true).trim();
    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};
    const groups = normalizeGroups(cfg);

    if (groups.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
      return interaction.editReply({ content: "Ya existe un grupo con ese nombre." });
    }

    groups.push({ name, channels: {} });
    const res = await saveMirrorConfig({ active: true, config: { ...cfg, groups } });
    if (!res.ok) return interaction.editReply({ content: "No se pudo guardar la configuración del mirror." });
    return interaction.editReply({ content: `Grupo creado: **${name}**` });
  }
};
