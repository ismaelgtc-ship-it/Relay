import { SlashCommandBuilder, ChannelType, PermissionFlagsBits } from "discord.js";
import { fetchMirrorModule, saveMirrorConfig, normalizeGroups, formatMirrorSaveError } from "./_mirrorStore.js";

export default {
  data: new SlashCommandBuilder()
    .setName("add_channel")
    .setDescription("➕ Add a channel to a Mirror group")
    .addStringOption((o) => o.setName("group").setDescription("Group name").setRequired(true))
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("Channel to add")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addStringOption((o) => o.setName("lang").setDescription("Language (e.g. EN, ES)").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const groupName = interaction.options.getString("group", true).trim();
    const channel = interaction.options.getChannel("channel", true);
    const langRaw = interaction.options.getString("lang", true).trim();
    const lang = langRaw.toUpperCase();

    if (!/^[A-Z]{2,10}$/.test(lang)) {
      return interaction.editReply({ content: "Invalid language code. Example: EN, ES, FR." });
    }

    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};
    const groups = normalizeGroups(cfg);

    let g = groups.find((x) => x.name.toLowerCase() === groupName.toLowerCase());
    if (!g) {
      g = { name: groupName, channels: {} };
      groups.push(g);
    }

    g.channels[String(channel.id)] = lang;

    const res = await saveMirrorConfig({ active: true, config: { ...cfg, groups } });
    if (!res.ok) {
      console.error("[mirror] add_channel save failed", { statusCode: res.statusCode, data: res.data });
      return interaction.editReply({ content: `Failed to save mirror configuration. ${formatMirrorSaveError(res)}` });
    }

    return interaction.editReply({ content: `Added ${channel} to **${g.name}** (${lang}).` });
  }
};
