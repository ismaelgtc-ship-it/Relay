import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder().setName("help").setDescription("ℹ️ List Devilwolf commands"),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("Devilwolf • Commands")
      .setDescription([
        "`/create_group` ` /delete_group` ` /add_channel` ` /remove_channel` ` /mirror_list` ` /mirror_clear`",
        "`/mirror_export` ` /mirror_import` ` /mirror_reset`",
        "`/set_language` ` /language_panel`",
        "`/remove_role`",
        "`/ocr`",
        "Context menu: `Translate` (right-click a message)"
      ].join("\n"));
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
