import { getDb } from "../mongo.js";

export async function registerService(service, { version = "0.0.0", meta = {} } = {}) {
  const db = await getDb();
  const now = new Date();

  await db.collection("service_registry").updateOne(
    { service },
    {
      $set: { service, version, meta, lastHeartbeatAt: now },
      $setOnInsert: { firstSeenAt: now }
    },
    { upsert: true }
  );
}

export async function heartbeat(service) {
  const db = await getDb();
  const now = new Date();
  const r = await db.collection("service_registry").updateOne(
    { service },
    { $set: { lastHeartbeatAt: now } }
  );
  return r.matchedCount > 0;
}

export async function listServices() {
  const db = await getDb();
  return await db.collection("service_registry").find({}).sort({ service: 1 }).toArray();
}
