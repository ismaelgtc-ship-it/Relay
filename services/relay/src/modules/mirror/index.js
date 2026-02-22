import {
  EmbedBuilder,
  escapeMarkdown,
  ChannelType
} from "discord.js";

/**
 * Mirror module
 * - Reads config from Gateway module state `mirror`
 * - Mirrors messages between channels in the same group
 * - Avoids duplicate username/content (content stays as message content; embed holds metadata)
 * - Mentions in content will ping; author mention is kept inside embed only (silent)
 */

function nowIso() {
  return new Date().toISOString();
}

function isTextChannel(ch) {
  return (
    ch &&
    (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement)
  );
}

function normalizeConfig(cfg) {
  const groups = Array.isArray(cfg?.groups) ? cfg.groups : [];

  const normGroups = [];
  for (const g of groups) {
    if (!g || typeof g !== "object") continue;
    const name = typeof g.name === "string" && g.name.trim() ? g.name.trim() : "group";

    // channels: { "123": "EN", "456": "ES" }
    const channels = g.channels && typeof g.channels === "object" ? g.channels : {};
    const entries = Object.entries(channels)
      .filter(([id, lang]) => typeof id === "string" && id && typeof lang === "string" && lang)
      .map(([id, lang]) => [id, lang.toUpperCase()]);

    if (entries.length < 2) continue;

    normGroups.push({ name, channels: Object.fromEntries(entries) });
  }

  return { groups: normGroups };
}

function findGroupForChannel(groups, channelId) {
  for (const g of groups) {
    if (g.channels[channelId]) return g;
  }
  return null;
}

function buildEmbed({ message, groupName, fromLang, toLang, targetChannelName }) {
  const authorTag = message.author?.tag ?? "unknown";

  const embed = new EmbedBuilder()
    .setAuthor({
      name: `${authorTag}  •  ${groupName}`,
      iconURL: message.author?.displayAvatarURL?.() ?? undefined
    })
    .setTimestamp(new Date());

  // Keep author mention silent: embed-only
  embed.setDescription(`From: <@${message.author.id}>`);

  // Links / attachments
  const files = Array.from(message.attachments?.values?.() ?? []);
  if (files.length > 0) {
    const firstImage = files.find((a) => (a.contentType || "").startsWith("image/"));
    if (firstImage?.url) embed.setImage(firstImage.url);

    const list = files
      .slice(0, 6)
      .map((a) => `• ${escapeMarkdown(a.name ?? "file")} — ${a.url}`)
      .join("\n");

    embed.addFields({ name: "Attachments", value: list });
  }

  embed.addFields({ name: "Jump", value: message.url });

  const footerParts = [];
  if (fromLang && toLang) footerParts.push(`${fromLang} → ${toLang}`);
  if (targetChannelName) footerParts.push(`#${targetChannelName}`);
  footerParts.push(nowIso());

  embed.setFooter({ text: footerParts.join("  |  ") });

  return embed;
}

export function createMirrorRuntime({ client, getState }) {
  async function onMessage(message) {
    try {
      if (!message?.guildId) return;
      if (!message?.channelId) return;
      if (message.author?.bot) return;
      if (message.webhookId) return;

      const state = getState();
      if (!state?.ok || !state.active || state.locked) return;

      const cfg = normalizeConfig(state.config);
      if (!cfg.groups.length) return;

      const group = findGroupForChannel(cfg.groups, message.channelId);
      if (!group) return;

      const fromLang = group.channels[message.channelId] ?? "";

      // Mirror to all other channels in group
      for (const [targetChannelId, toLang] of Object.entries(group.channels)) {
        if (targetChannelId === message.channelId) continue;

        const ch = await client.channels.fetch(targetChannelId).catch(() => null);
        if (!isTextChannel(ch)) continue;

        const embed = buildEmbed({
          message,
          groupName: group.name,
          fromLang,
          toLang,
          targetChannelName: ch.name
        });

        // Content carries mentions so they can ping.
        const content = (message.content ?? "").trim();

        await ch.send({
          content: content.length ? content : undefined,
          embeds: [embed]
        });
      }
    } catch (e) {
      console.error("[relay] mirror error", String(e?.message || e));
    }
  }

  return {
    bind() {
      client.on("messageCreate", onMessage);
    }
  };
}
