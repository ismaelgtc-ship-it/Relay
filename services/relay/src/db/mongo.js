
import { MongoClient } from "mongodb";

let client;
let db;

export async function connectMongo(uri, dbName) {
  if (db) return db;

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);

  console.log("[relay] Mongo connected");
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error("Mongo not initialized. Call connectMongo first.");
  }
  return db;
}

// Alias to prevent future import mismatches
export const getMongoDb = getDb;
