import { MongoClient } from "mongodb";

let client;
let db;

/**
 * Connects to Mongo and returns db instance.
 * Safe to call multiple times.
 */
export async function connectMongo(uri, dbName = "devilwolf") {
  if (!uri) throw new Error("Missing Mongo URI");
  if (db) return db;

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);

  console.log("[relay] Mongo connected");
  return db;
}

export function getDb() {
  if (!db) throw new Error("Mongo not initialized. Call connectMongo first.");
  return db;
}

/**
 * Back-compat helper used by routes.
 */
export async function getMongoDb(uri, dbName = "devilwolf") {
  return connectMongo(uri, dbName);
}
