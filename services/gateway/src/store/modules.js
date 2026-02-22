import { MODULE_MANIFEST } from "../../../../packages/core/moduleManifest.js";
import { getDb } from "../mongo.js";

function isKnownModule(name) {
  return Object.prototype.hasOwnProperty.call(MODULE_MANIFEST, name);
}

export async function getModuleState(name) {
  if (!isKnownModule(name)) return null;

  const db = await getDb();
  const cfg = await db.collection("modules_config").findOne({ name });
  const lock = await db.collection("module_locks").findOne({ name });

  return {
    name,
    owner: MODULE_MANIFEST[name].owner,
    description: MODULE_MANIFEST[name].description,
    active: cfg?.active ?? true,
    locked: Boolean(lock?.locked),
    lockReason: lock?.reason ?? "",
    config: cfg?.config ?? {}
  };
}

export async function listModuleStates() {
  const names = Object.keys(MODULE_MANIFEST);
  const db = await getDb();

  const cfgs = await db.collection("modules_config").find({ name: { $in: names } }).toArray();
  const locks = await db.collection("module_locks").find({ name: { $in: names } }).toArray();

  const cfgMap = new Map(cfgs.map((d) => [d.name, d]));
  const lockMap = new Map(locks.map((d) => [d.name, d]));

  return names
    .map((name) => {
      const cfg = cfgMap.get(name);
      const lock = lockMap.get(name);
      return {
        name,
        owner: MODULE_MANIFEST[name].owner,
        description: MODULE_MANIFEST[name].description,
        active: cfg?.active ?? true,
        locked: Boolean(lock?.locked),
        lockReason: lock?.reason ?? "",
        config: cfg?.config ?? {}
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function putModuleConfig(name, { active, config } = {}) {
  if (!isKnownModule(name)) return null;
  const db = await getDb();

  await db.collection("modules_config").updateOne(
    { name },
    {
      $set: {
        name,
        updatedAt: new Date(),
        ...(typeof active === "boolean" ? { active } : {}),
        ...(config && typeof config === "object" ? { config } : {})
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );

  return await getModuleState(name);
}

export async function setModuleLock(name, { locked, reason = "" } = {}) {
  if (!isKnownModule(name)) return null;
  const db = await getDb();

  if (!locked) {
    await db.collection("module_locks").deleteOne({ name });
    return await getModuleState(name);
  }

  await db.collection("module_locks").updateOne(
    { name },
    {
      $set: { name, locked: true, reason, updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );

  return await getModuleState(name);
}
