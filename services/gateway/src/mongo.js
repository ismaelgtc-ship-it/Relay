import { MongoClient } from "mongodb";
import { env } from "./env.js";

let clientPromise = null;

function inferDbNameFromUri(uri) {
  const m = uri.match(/mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/);
  const raw = m?.[1] ? decodeURIComponent(m[1]) : "";
  return raw || "devilwolf";
}

export async function getMongoClient() {
  if (!clientPromise) {
    const client = new MongoClient(env.MONGODB_URI_GATEWAY, { maxPoolSize: 10 });
    clientPromise = client.connect();
  }
  return await clientPromise;
}

export async function getDb() {
  const client = await getMongoClient();
  const dbName = env.MONGODB_DB_GATEWAY || inferDbNameFromUri(env.MONGODB_URI_GATEWAY);
  return client.db(dbName);
}
