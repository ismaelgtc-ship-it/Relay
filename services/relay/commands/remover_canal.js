import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import { fetchMirrorModule, saveMirrorConfig, normalizeGroups } from "./_mirrorStore.js";

export default {
  data: new SlashCommandBuilder().setName("remove_channel").setDescription("➖ Remove a channel from a Mirror group"),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};
    const groups = normalizeGroups(cfg);
    if (!groups.length) return interaction.editReply({ content: "No groups found." });

    const menu = new StringSelectMenuBuilder()
      .setCustomId("mirror:remove_channel:group")
      .setPlaceholder("Select a group")
      .addOptions(groups.slice(0,25).map((g)=>({ label: g.name, value: g.name })));

    await interaction.editReply({ content: "Choose a group:", components: [new ActionRowBuilder().addComponents(menu)] });
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
        await interaction.editReply({ content: "This group has no channels.", components: [] });
        return true;
      }

      const chMenu = new StringSelectMenuBuilder()
        .setCustomId(`mirror:remove_channel:channel:${group}`)
        .setPlaceholder("Select a channel")
        .addOptions(channels.slice(0,25).map((id)=>({ label: id, value: id, description: `#${id}` })));

      await interaction.editReply({ content: `Group: **${group}**\nSelect a channel to remove:`, components: [new ActionRowBuilder().addComponents(chMenu)] });
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
      await interaction.editReply({ content: `Removed <#${channelId}> from **${group}**`, components: [] });
      return true;
    }

    return false;
  }
};
