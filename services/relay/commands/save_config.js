import { SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import { fetchMirrorModule } from "./_mirrorStore.js";

export default {
  data: new SlashCommandBuilder().setName("mirror_export").setDescription("💾 Export Mirror config as JSON"),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};
    const buf = Buffer.from(JSON.stringify(cfg, null, 2), "utf-8");
    const file = new AttachmentBuilder(buf, { name: "mirror.config.json" });
    await interaction.editReply({ content: "Exported config:", files: [file] });
  }
};
