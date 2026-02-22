// Static module manifest (contract v1)
// NOTE: This file is intentionally local to the gateway service so Docker build contexts
// can remain per-service (services/gateway) without relying on a monorepo root copy.

export const MODULE_MANIFEST = Object.freeze([
  { name: "mirror", owner: "realtime", description: "Cross-channel message replication" },
  { name: "calendar", owner: "realtime", description: "Scheduled events system" },
  { name: "embedpro", owner: "realtime", description: "Advanced embed automation" },
  { name: "user_language", owner: "realtime", description: "Per-user language preferences" },
  { name: "ocr", owner: "heavy", description: "OCR processing engine" }
]);

export function isKnownModule(name) {
  return MODULE_MANIFEST.some((m) => m.name === name);
}
