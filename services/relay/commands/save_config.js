import { SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import { fetchMirrorModule } from "./_mirrorStore.js";

export default {
  data: new SlashCommandBuilder().setName("save_config").setDescription("Exporta config mirror como JSON"),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};
    const buf = Buffer.from(JSON.stringify(cfg, null, 2), "utf-8");
    const file = new AttachmentBuilder(buf, { name: "mirror.config.json" });
    await interaction.editReply({ content: "Config exportada:", files: [file] });
  }
};
