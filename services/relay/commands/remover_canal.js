import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import { fetchMirrorModule, saveMirrorConfig, normalizeGroups } from "./_mirrorStore.js";

export default {
  data: new SlashCommandBuilder().setName("remover_canal").setDescription("Remueve un canal de un grupo mirror"),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};
    const groups = normalizeGroups(cfg);
    if (!groups.length) return interaction.editReply({ content: "No hay grupos." });

    const menu = new StringSelectMenuBuilder()
      .setCustomId("mirror:remove_channel:group")
      .setPlaceholder("Selecciona grupo")
      .addOptions(groups.slice(0,25).map((g)=>({ label: g.name, value: g.name })));

    await interaction.editReply({ content: "Elige grupo:", components: [new ActionRowBuilder().addComponents(menu)] });
  },

  async handleComponent(interaction) {
    if (interaction.isStringSelectMenu() && interaction.customId === "mirror:remove_channel:group") {
      await interaction.deferUpdate();
      const group = interaction.values[0];
      const mod = await fetchMirrorModule();
      const cfg = mod?.config || {};
      const groups = normalizeGroups(cfg);
      const g = groups.find((x)=>x.name===group);
      const channels = Object.keys(g?.channels || {});
      if (!channels.length) {
        await interaction.editReply({ content: "Este grupo no tiene canales.", components: [] });
        return true;
      }

      const chMenu = new StringSelectMenuBuilder()
        .setCustomId(`mirror:remove_channel:channel:${group}`)
        .setPlaceholder("Selecciona canal")
        .addOptions(channels.slice(0,25).map((id)=>({ label: id, value: id, description: `#${id}` })));

      await interaction.editReply({ content: `Grupo: **${group}**\nSelecciona canal a remover:`, components: [new ActionRowBuilder().addComponents(chMenu)] });
      return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("mirror:remove_channel:channel:")) {
      await interaction.deferUpdate();
      const group = interaction.customId.split(":").slice(-1)[0];
      const channelId = interaction.values[0];

      const mod = await fetchMirrorModule();
      const cfg = mod?.config || {};
      const groups = normalizeGroups(cfg);
      const g = groups.find((x)=>x.name===group);
      if (!g) return true;
      delete g.channels[channelId];

      await saveMirrorConfig({ active: true, config: { ...cfg, groups } });
      await interaction.editReply({ content: `Canal removido <#${channelId}> de **${group}**`, components: [] });
      return true;
    }

    return false;
  }
};
