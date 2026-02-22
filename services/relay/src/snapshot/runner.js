import { env } from "../env.js";
import { buildSnapshot } from "../snapshot.js";
import { getMongoDb } from "../db/mongo.js";
import { saveSnapshot } from "./store.js";

export function startSnapshotLoop({ client }) {
  if (!env.SNAPSHOT_ENABLED) {
    console.log("[relay] snapshot loop disabled (SNAPSHOT_ENABLED=false)");
    return null;
  }
  if (!env.MONGO_URI || !env.GUILD_ID) {
    console.log("[relay] snapshot loop disabled (missing MONGO_URI or GUILD_ID)");
    return null;
  }

  let timer = null;

  const intervalMs = Math.max(10_000, env.SNAPSHOT_INTERVAL_SEC * 1000);

  async function tick() {
    try {
      const guild = await client.guilds.fetch(env.GUILD_ID).catch(() => null);
      if (!guild) return;

      const data = await buildSnapshot(guild);
      const takenAt = new Date().toISOString();

      const db = await getMongoDb(env.MONGO_URI);
      await saveSnapshot(db, { guildId: env.GUILD_ID, takenAt, data });

      console.log("[relay] snapshot saved", { guildId: env.GUILD_ID, takenAt });
    } catch (e) {
      console.log("[relay] snapshot tick failed", String(e?.message || e));
    }
  }

  // First snapshot soon after boot; then interval.
  timer = setTimeout(() => {
    tick();
    timer = setInterval(tick, intervalMs);
  }, 2000);

  return () => {
    if (timer) clearInterval(timer);
  };
}
