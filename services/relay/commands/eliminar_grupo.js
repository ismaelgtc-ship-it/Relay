import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import { fetchMirrorModule, saveMirrorConfig, normalizeGroups, formatMirrorSaveError } from "./_mirrorStore.js";

export default {
  data: new SlashCommandBuilder().setName("delete_group").setDescription("🗑️ Delete a Mirror group"),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};
    const groups = normalizeGroups(cfg);
    if (!groups.length) return interaction.editReply({ content: "No groups found." });

    const menu = new StringSelectMenuBuilder()
      .setCustomId("mirror:delete_group")
      .setPlaceholder("Select a group")
      .addOptions(groups.slice(0, 25).map((g) => ({ label: g.name, value: g.name })));

    const row = new ActionRowBuilder().addComponents(menu);
    await interaction.editReply({ content: "Choose a group to delete:", components: [row] });
  },

  async handleComponent(interaction) {
    if (!interaction.isStringSelectMenu()) return false;
    if (interaction.customId !== "mirror:delete_group") return false;
    await interaction.deferUpdate();

    const target = interaction.values?.[0];
    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};
    const groups = normalizeGroups(cfg).filter((g) => g.name !== target);

    const res = await saveMirrorConfig({ active: true, config: { ...cfg, groups } });
    if (!res.ok) {
      console.error("[mirror] delete_group save failed", { statusCode: res.statusCode, data: res.data });
      await interaction.editReply({
        content: `Failed to save mirror configuration. ${formatMirrorSaveError(res)}`,
        components: []
      });
      return true;
    }

    await interaction.editReply({ content: `Group deleted: **${target}**`, components: [] });
    return true;
  }
};
