import { z } from "zod";
import { getDb } from "./db.js";
import { MODULE_MANIFEST, isKnownModule } from "./moduleManifest.js";

const COL_CONFIG = "modules_config";
const COL_LOCKS = "module_locks";
const COL_AUDIT = "audit_log";

const MirrorConfigSchema = z.object({
  groups: z
    .array(
      z.object({
        name: z.string().min(1).max(64),
        channels: z.record(z.string().min(1), z.string().min(2).max(5))
      })
    )
    .default([])
});

function validateMirrorConfig(config) {
  const parsed = MirrorConfigSchema.safeParse(config ?? {});
  if (!parsed.success) {
    return { ok: false, error: "INVALID_CONFIG", details: parsed.error.flatten() };
  }

  const groups = parsed.data.groups;
  const seenChannels = new Set();
  for (const g of groups) {
    const langsInGroup = new Set();
    for (const [channelId, langRaw] of Object.entries(g.channels ?? {})) {
      const lang = String(langRaw).toUpperCase();
      if (!/^[A-Z]{2,5}i.test(String(lang))) return { ok: false, error: "INVALID_LANGUAGE", details: { channelId, lang } };
      if (seenChannels.has(channelId)) return { ok: false, error: "DUPLICATE_CHANNEL", details: { channelId } };
      if (langsInGroup.has(lang)) return { ok: false, error: "DUPLICATE_LANGUAGE", details: { group: g.name, lang } };
      seenChannels.add(channelId);
      langsInGroup.add(lang);
    }
  }

  return { ok: true, value: { groups } };
}

function validateModuleConfig(name, config) {
  if (name === "mirror") return validateMirrorConfig(config);
  // Other modules: accept any JSON object (future)
  return { ok: true, value: config ?? {} };
}

export async function listModules() {
  const db = await getDb();
  const configs = await db.collection(COL_CONFIG).find({}).toArray();
  const locks = await db.collection(COL_LOCKS).find({}).toArray();

  const cfgMap = new Map(configs.map((d) => [d.name, d]));
  const lockMap = new Map(locks.map((d) => [d.name, d]));

  return Object.entries(MODULE_MANIFEST).map(([name, meta]) => {
    const cfg = cfgMap.get(name);
    const lock = lockMap.get(name);
    return {
      name,
      owner: meta.owner,
      description: meta.description,
      active: Boolean(cfg?.active ?? false),
      locked: Boolean(lock?.locked ?? false),
      config: cfg?.config ?? {}
    };
  });
}

export async function getModule(name) {
  if (!isKnownModule(name)) return null;
  const db = await getDb();
  const cfg = await db.collection(COL_CONFIG).findOne({ name });
  const lock = await db.collection(COL_LOCKS).findOne({ name });
  const meta = MODULE_MANIFEST[name];

  return {
    name,
    owner: meta.owner,
    description: meta.description,
    active: Boolean(cfg?.active ?? false),
    locked: Boolean(lock?.locked ?? false),
    config: cfg?.config ?? {}
  };
}

export async function setModuleConfig(name, { active, config }, actor = "dashboard") {
  if (!isKnownModule(name)) return { ok: false, error: "UNKNOWN_MODULE" };
  const validated = validateModuleConfig(name, config);
  if (!validated.ok) return validated;

  const db = await getDb();
  await db.collection(COL_CONFIG).updateOne(
    { name },
    {
      $set: {
        name,
        active: Boolean(active),
        config: validated.value,
        updatedAt: Date.now()
      }
    },
    { upsert: true }
  );

  await db.collection(COL_AUDIT).insertOne({
    ts: Date.now(),
    action: "SET_CONFIG",
    actor,
    name,
    active: Boolean(active)
  });

  return { ok: true };
}

export async function lockModule(name, actor = "dashboard") {
  if (!isKnownModule(name)) return { ok: false, error: "UNKNOWN_MODULE" };
  const db = await getDb();
  await db.collection(COL_LOCKS).updateOne(
    { name },
    {
      $set: {
        name,
        locked: true,
        lockedAt: Date.now(),
        lockedBy: actor
      }
    },
    { upsert: true }
  );
  await db.collection(COL_AUDIT).insertOne({ ts: Date.now(), action: "LOCK", actor, name });
  return { ok: true };
}

export async function unlockModule(name, actor = "dashboard") {
  if (!isKnownModule(name)) return { ok: false, error: "UNKNOWN_MODULE" };
  const db = await getDb();
  await db.collection(COL_LOCKS).updateOne(
    { name },
    {
      $set: {
        name,
        locked: false,
        unlockedAt: Date.now(),
        unlockedBy: actor
      }
    },
    { upsert: true }
  );
  await db.collection(COL_AUDIT).insertOne({ ts: Date.now(), action: "UNLOCK", actor, name });
  return { ok: true };
}
