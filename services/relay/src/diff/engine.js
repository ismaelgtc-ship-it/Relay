export function computeDiff(previous, current) {
  const diff = {
    guildId: current.guildId,
    from: previous._id,
    to: current._id,
    roles: { created: [], deleted: [], updated: [] },
    channels: { created: [], deleted: [], updated: [] },
    takenAt: new Date()
  };

  const prevRoles = new Map(previous.roles.map(r => [r.id, r]));
  const currRoles = new Map(current.roles.map(r => [r.id, r]));

  for (const [id, role] of currRoles) {
    if (!prevRoles.has(id)) {
      diff.roles.created.push(role);
    } else {
      const prev = prevRoles.get(id);
      if (
        prev.name !== role.name ||
        prev.position !== role.position ||
        prev.permissions !== role.permissions
      ) {
        diff.roles.updated.push({ before: prev, after: role });
      }
    }
  }

  for (const [id, role] of prevRoles) {
    if (!currRoles.has(id)) {
      diff.roles.deleted.push(role);
    }
  }

  const prevChannels = new Map(previous.channels.map(c => [c.id, c]));
  const currChannels = new Map(current.channels.map(c => [c.id, c]));

  for (const [id, channel] of currChannels) {
    if (!prevChannels.has(id)) {
      diff.channels.created.push(channel);
    } else {
      const prev = prevChannels.get(id);
      if (
        prev.name !== channel.name ||
        prev.position !== channel.position ||
        prev.parentId !== channel.parentId ||
        JSON.stringify(prev.permissionOverwrites) !== JSON.stringify(channel.permissionOverwrites)
      ) {
        diff.channels.updated.push({ before: prev, after: channel });
      }
    }
  }

  for (const [id, channel] of prevChannels) {
    if (!currChannels.has(id)) {
      diff.channels.deleted.push(channel);
    }
  }

  return diff;
}
