import { getDb } from "../mongo.js";

export async function writeAudit(entry) {
  const db = await getDb();
  const doc = {
    at: new Date(),
    actor: entry.actor ?? "unknown",
    action: entry.action ?? "unknown",
    target: entry.target ?? "",
    meta: entry.meta ?? {}
  };
  await db.collection("audit_log").insertOne(doc);
  return doc;
}
