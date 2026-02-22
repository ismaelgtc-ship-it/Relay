export async function buildGuildSnapshot(guild) {
  const roles = guild.roles.cache
    .sort((a, b) => b.position - a.position)
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      mentionable: r.mentionable,
      permissions: r.permissions.bitfield.toString(),
      position: r.position
    }));

  const channels = guild.channels.cache
    .sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0))
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      parentId: c.parentId ?? null,
      position: c.rawPosition ?? 0,
      overwrites: c.permissionOverwrites.cache.map((po) => ({
        id: po.id,
        type: po.type,
        allow: po.allow.bitfield.toString(),
        deny: po.deny.bitfield.toString()
      }))
    }));

  return {
    guild: {
      id: guild.id,
      name: guild.name
    },
    roles,
    channels,
    ts: new Date().toISOString()
  };
}
