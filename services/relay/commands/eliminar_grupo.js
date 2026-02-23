import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import { fetchMirrorModule, saveMirrorConfig, normalizeGroups } from "./_mirrorStore.js";

export default {
  data: new SlashCommandBuilder().setName("eliminar_grupo").setDescription("Elimina un grupo de espejo"),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};
    const groups = normalizeGroups(cfg);
    if (!groups.length) return interaction.editReply({ content: "No hay grupos." });

    const menu = new StringSelectMenuBuilder()
      .setCustomId("mirror:delete_group")
      .setPlaceholder("Selecciona grupo")
      .addOptions(groups.slice(0, 25).map((g) => ({ label: g.name, value: g.name })));

    const row = new ActionRowBuilder().addComponents(menu);
    await interaction.editReply({ content: "Elige el grupo a eliminar:", components: [row] });
  },

  async handleComponent(interaction) {
    if (!interaction.isStringSelectMenu()) return false;
    if (interaction.customId !== "mirror:delete_group") return false;
    await interaction.deferUpdate();

    const target = interaction.values?.[0];
    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};
    const groups = normalizeGroups(cfg).filter((g) => g.name !== target);

    await saveMirrorConfig({ active: true, config: { ...cfg, groups } });
    await interaction.editReply({ content: `Grupo eliminado: **${target}**`, components: [] });
    return true;
  }
};
