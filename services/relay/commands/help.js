import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder().setName("help").setDescription("Lista comandos Devilwolf"),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("Devilwolf • Comandos")
      .setDescription([
        "`/crear_grupo` ` /eliminar_grupo` ` /añadir_canal` ` /remover_canal` ` /list` ` /limpiar`",
        "`/save_config` ` /load_config` ` /wipe_config`",
        "`/select_language` ` /select_language_edit`",
        "`/remove_rol`",
        "`/ocr`",
        "Context menu: `TRANSLATE` (clic derecho en un mensaje)"
      ].join("\n"));
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
