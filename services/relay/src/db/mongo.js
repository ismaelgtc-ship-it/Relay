import { MongoClient } from "mongodb";

/**
 * Minimal Mongo helper (ESM) with a single shared client.
 * We connect lazily to avoid crashing when MONGO_URI is not configured.
 */
let _client = null;
let _db = null;

export async function getMongoDb(mongoUri) {
  if (!mongoUri) throw new Error("MONGO_URI is not configured");
  if (_db) return _db;

  _client = new MongoClient(mongoUri, {
    // Serverless-safe defaults; driver will manage pooling.
    maxPoolSize: 5
  });

  await _client.connect();
  _db = _client.db(); // default DB from URI
  return _db;
}

export async function closeMongo() {
  if (_client) {
    await _client.close();
    _client = null;
    _db = null;
  }
}
