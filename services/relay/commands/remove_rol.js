import { SlashCommandBuilder, ActionRowBuilder, RoleSelectMenuBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder().setName("remove_role").setDescription("🎭 Remove a role from yourself (selector)"),
  async execute(interaction) {
    const menu = new RoleSelectMenuBuilder()
      .setCustomId("role:remove:self")
      .setPlaceholder("Select a role to remove")
      .setMinValues(1)
      .setMaxValues(1);
    await interaction.reply({ content: "Select the role to remove:", components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
  },

  async handleComponent(interaction) {
    if (!interaction.isRoleSelectMenu()) return false;
    if (interaction.customId !== "role:remove:self") return false;
    await interaction.deferUpdate();

    const roleId = interaction.values[0];
    const member = interaction.member;
    if (!member?.roles?.remove) {
      await interaction.editReply({ content: "Could not access the member object.", components: [] });
      return true;
    }
    await member.roles.remove(roleId).catch(() => null);
    await interaction.editReply({ content: `Role removed: <@&${roleId}>`, components: [] });
    return true;
  }
};
