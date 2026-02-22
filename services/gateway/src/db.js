import { MongoClient } from "mongodb";
import { env } from "./env.js";

let _client;
let _db;

export async function getDb() {
  if (_db) return _db;
  if (!env.MONGODB_URI) throw new Error("Missing env: MONGODB_URI");
  if (!env.MONGODB_DB) throw new Error("Missing env: MONGODB_DB");

  _client = new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 10
  });
  await _client.connect();
  _db = _client.db(env.MONGODB_DB);
  return _db;
}

export async function closeDb() {
  try {
    await _client?.close();
  } finally {
    _client = undefined;
    _db = undefined;
  }
}
