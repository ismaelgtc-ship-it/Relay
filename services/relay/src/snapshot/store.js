import { getDb } from "../db/mongo.js";
import { computeDiff } from "../diff/engine.js";

export async function saveSnapshot(snapshot) {
  const db = await getDb();
  const collection = db.collection("guild_snapshots");

  const previous = await collection
    .find({ guildId: snapshot.guildId })
    .sort({ takenAt: -1 })
    .limit(1)
    .next();

  const result = await collection.insertOne({
    ...snapshot,
    takenAt: new Date(),
  });

  const current = await collection.findOne({ _id: result.insertedId });

  if (previous) {
    const diff = computeDiff(previous, current);
    await db.collection("guild_diffs").insertOne(diff);
  }

  return current;
}

export async function getLatestSnapshot(guildId) {
  const db = await getDb();
  return db
    .collection("guild_snapshots")
    .find({ guildId })
    .sort({ takenAt: -1 })
    .limit(1)
    .next();
}
