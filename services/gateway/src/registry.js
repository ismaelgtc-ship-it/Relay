import { getDb } from "./db.js";

const COL = "service_registry";

export async function registerService(service, payload = {}) {
  const db = await getDb();
  const now = Date.now();
  await db.collection(COL).updateOne(
    { service },
    {
      $setOnInsert: { firstSeenAt: now },
      $set: {
        service,
        version: payload.version ?? "0.0.0",
        meta: payload.meta ?? {},
        lastHeartbeatAt: now
      }
    },
    { upsert: true }
  );
}

export async function heartbeat(service) {
  const db = await getDb();
  const now = Date.now();
  const res = await db
    .collection(COL)
    .updateOne({ service }, { $set: { lastHeartbeatAt: now } });
  return res.matchedCount > 0;
}

export async function listServices() {
  const db = await getDb();
  return db
    .collection(COL)
    .find({}, { projection: { _id: 0 } })
    .sort({ service: 1 })
    .toArray();
}
