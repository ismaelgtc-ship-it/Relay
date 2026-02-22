import { EmbedBuilder } from "discord.js";

function isImage(url = "") {
  return /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(url);
}

export function createMirrorRuntime() {
  let state = {
    active: false,
    locked: false,
    config: { groups: [] }
  };

  return {
    setState(next) {
      state = {
        active: Boolean(next?.active),
        locked: Boolean(next?.locked),
        config: next?.config ?? { groups: [] }
      };
    },
    getState() {
      return state;
    },
    async onMessage(message) {
      if (!state.active || state.locked) return;
      if (!message?.guild) return;
      if (message.author?.bot) return;

      const channelId = message.channelId;
      const groups = state.config?.groups ?? [];
      const group = groups.find((g) => Object.hasOwn(g?.channels ?? {}, channelId));
      if (!group) return;

      const targets = Object.keys(group.channels ?? {}).filter((id) => id !== channelId);
      if (targets.length === 0) return;

      const jump = message.url;
      const embed = new EmbedBuilder()
        .setAuthor({
          name: message.author?.tag ?? "Unknown",
          iconURL: message.author?.displayAvatarURL?.() ?? undefined
        })
        // keep UX clean: no duplicated username/content
        .setDescription(`**Mirror** • Group: \`${group.name}\`\nSource: <#${channelId}>`)
        .setFooter({ text: `Message ID: ${message.id}` })
        .setTimestamp(Date.now());

      const attachments = Array.from(message.attachments?.values?.() ?? []);
      const attachmentLinks = attachments.map((a) => a.url);

      // Put a preview image if any attachment is an image
      const img = attachments.find((a) => isImage(a.url));
      if (img) embed.setImage(img.url);

      if (jump) embed.addFields({ name: "Jump", value: jump });
      if (attachmentLinks.length > 0) {
        const lines = attachmentLinks.slice(0, 5).map((u, i) => `${i + 1}. ${u}`);
        if (attachmentLinks.length > 5) lines.push(`… +${attachmentLinks.length - 5} more`);
        embed.addFields({ name: "Attachments", value: lines.join("\n") });
      }

      const payload = {
        content: message.content?.length ? message.content : null,
        embeds: [embed],
        allowedMentions: {
          parse: ["users", "roles", "everyone"]
        }
      };

      for (const targetId of targets) {
        const ch = await message.guild.channels.fetch(targetId).catch(() => null);
        if (!ch || !ch.isTextBased?.()) continue;
        await ch.send(payload).catch(() => null);
      }
    }
  };
}
