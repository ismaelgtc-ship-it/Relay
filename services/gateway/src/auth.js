import { env } from "./env.js";

function readBearer(req) {
  const h = req.get("authorization") || req.get("Authorization") || "";
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  return m?.[1] || "";
}

export function requireDashboardKey(req, res, next) {
  const key =
    req.get("X-API-Key") ||
    req.get("x-api-key") ||
    readBearer(req);

  if (!key || key !== env.DASHBOARD_API_KEY) {
    return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
  }
  next();
}

export function requireInternalKey(req, res, next) {
  const key = req.get("X-Internal-Key") || req.get("x-internal-key");
  if (!key || key !== env.INTERNAL_API_KEY) {
    return res.status(401).json({ ok: false, error: "UNAUTHORIZED_INTERNAL" });
  }
  next();
}
