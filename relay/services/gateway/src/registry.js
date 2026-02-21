/**
 * In-memory registry (skeleton).
 * Can be swapped to Mongo later without changing contract shape.
 */
const services = new Map();

export function registerService(service, payload = {}) {
  const now = Date.now();
  services.set(service, {
    service,
    version: payload.version ?? "0.0.0",
    meta: payload.meta ?? {},
    firstSeenAt: now,
    lastHeartbeatAt: now
  });
}

export function heartbeat(service) {
  const now = Date.now();
  const cur = services.get(service);
  if (!cur) return false;
  cur.lastHeartbeatAt = now;
  services.set(service, cur);
  return true;
}

export function listServices() {
  return Array.from(services.values()).sort((a, b) => a.service.localeCompare(b.service));
}
