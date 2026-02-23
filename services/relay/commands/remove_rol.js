import { SlashCommandBuilder, ActionRowBuilder, RoleSelectMenuBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder().setName("remove_rol").setDescription("Remueve un rol de tu usuario (selector)"),
  async execute(interaction) {
    const menu = new RoleSelectMenuBuilder()
      .setCustomId("role:remove:self")
      .setPlaceholder("Selecciona rol a remover")
      .setMinValues(1)
      .setMaxValues(1);
    await interaction.reply({ content: "Selecciona el rol a remover:", components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
  },

  async handleComponent(interaction) {
    if (!interaction.isRoleSelectMenu()) return false;
    if (interaction.customId !== "role:remove:self") return false;
    await interaction.deferUpdate();

    const roleId = interaction.values[0];
    const member = interaction.member;
    if (!member?.roles?.remove) {
      await interaction.editReply({ content: "No se pudo acceder al miembro.", components: [] });
      return true;
    }
    await member.roles.remove(roleId).catch(() => null);
    await interaction.editReply({ content: `Rol removido: <@&${roleId}>`, components: [] });
    return true;
  }
};
