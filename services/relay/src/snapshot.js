/**
 * Build a normalized snapshot of a Discord guild (server).
 * This snapshot is the baseline for the dashboard "clone" and future diffs.
 */
export async function buildGuildSnapshot(client, guildId) {
  const guild = await client.guilds.fetch(guildId);

  // Fetch roles/channels to ensure caches are populated.
  const roles = await guild.roles.fetch();
  const channels = await guild.channels.fetch();

  const roleList = [...roles.values()]
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      mentionable: r.mentionable,
      managed: r.managed,
      position: r.position,
      permissions: r.permissions.bitfield.toString(),
      tags: r.tags ? { ...r.tags } : null
    }));

  const channelList = [...channels.values()]
    .sort((a, b) => a.rawPosition - b.rawPosition)
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      parentId: c.parentId ?? null,
      position: c.rawPosition,
      nsfw: Boolean(c.nsfw),
      topic: "topic" in c ? (c.topic ?? null) : null,
      rateLimitPerUser: "rateLimitPerUser" in c ? (c.rateLimitPerUser ?? null) : null,
      bitrate: "bitrate" in c ? (c.bitrate ?? null) : null,
      userLimit: "userLimit" in c ? (c.userLimit ?? null) : null,
      rtcRegion: "rtcRegion" in c ? (c.rtcRegion ?? null) : null,
      flags: "flags" in c ? (c.flags?.bitfield?.toString?.() ?? null) : null,
      permissionOverwrites: c.permissionOverwrites?.cache
        ? [...c.permissionOverwrites.cache.values()].map((po) => ({
            id: po.id,
            type: po.type,
            allow: po.allow.bitfield.toString(),
            deny: po.deny.bitfield.toString()
          }))
        : []
    }));

  return {
    schemaVersion: 1,
    guild: {
      id: guild.id,
      name: guild.name,
      description: guild.description ?? null,
      ownerId: guild.ownerId ?? null,
      afkChannelId: guild.afkChannelId ?? null,
      afkTimeout: guild.afkTimeout ?? null,
      verificationLevel: guild.verificationLevel ?? null,
      defaultMessageNotifications: guild.defaultMessageNotifications ?? null,
      explicitContentFilter: guild.explicitContentFilter ?? null,
      mfaLevel: guild.mfaLevel ?? null,
      nsfwLevel: guild.nsfwLevel ?? null,
      premiumTier: guild.premiumTier ?? null,
      premiumSubscriptionCount: guild.premiumSubscriptionCount ?? null,
      features: Array.isArray(guild.features) ? [...guild.features] : []
    },
    roles: roleList,
    channels: channelList,
    takenAt: new Date().toISOString()
  };
}
