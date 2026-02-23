import { SlashCommandBuilder, ChannelType, PermissionFlagsBits } from "discord.js";

// Minimal implementation (mirror config) compatible with current module shape in src/modules/mirror
// Command name must be ASCII; Discord does not accept "ñ" in command names.
export default {
  data: new SlashCommandBuilder()
    .setName("add_channel")
    .setDescription("🪞 Add a channel to a Mirror group (stored in Gateway).")
    .addStringOption((o) => o.setName("group").setDescription("Group name").setRequired(true))
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("Channel to add")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addStringOption((o) => o.setName("lang").setDescription("Language (e.g. ES, EN)").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, ctx = {}) {
    const groupName = interaction.options.getString("group", true).trim();
    const channel = interaction.options.getChannel("channel", true);
    const lang = interaction.options.getString("lang", true).trim().toUpperCase();

    // Gateway module schema: { groups: [{ name, channels: { [channelId]: "ES" } }] }
    const gatewayUrl = process.env.GATEWAY_URL;
    const internalKey = process.env.INTERNAL_API_KEY || process.env.INTERNAL_KEY;

    if (!gatewayUrl || !internalKey) {
      await interaction.reply({ content: "❌ Missing GATEWAY_URL or INTERNAL_API_KEY in Relay.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    // Load current mirror config
    const { request } = await import("undici");
    const getRes = await request(`${gatewayUrl}/internal/modules/mirror`, {
      method: "GET",
      headers: { "X-Internal-Key": internalKey }
    });

    if (getRes.statusCode >= 400) {
      const body = await getRes.body.text();
      await interaction.editReply(`❌ Gateway error reading mirror config: ${getRes.statusCode} ${body}`);
      return;
    }

    const mod = await getRes.body.json();
    const cfg = (mod && mod.config) || {};
    const groups = Array.isArray(cfg.groups) ? cfg.groups : [];

    // Upsert group
    let group = groups.find(g => (g?.name || "").toLowerCase() === groupName.toLowerCase());
    if (!group) {
      group = { name: groupName, channels: {} };
      groups.push(group);
    }
    if (!group.channels || typeof group.channels !== "object") group.channels = {};
    group.channels[String(channel.id)] = lang;

    const newCfg = { ...cfg, groups };

    const putRes = await request(`${gatewayUrl}/internal/module/mirror/config`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "X-Internal-Key": internalKey
      },
      body: JSON.stringify({ config: newCfg })
    });

    if (putRes.statusCode >= 400) {
      const body = await putRes.body.text();
      await interaction.editReply(`❌ Gateway error saving mirror config: ${putRes.statusCode} ${body}`);
      return;
    }

    await interaction.editReply(
      `✅ Added <#${channel.id}> to **${groupName}** with language **${lang}**.`
    );
  }
};
