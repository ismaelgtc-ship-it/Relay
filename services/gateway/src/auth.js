function readApiKey(req) {
  const direct = req.get("X-API-Key");
  if (direct) return direct;
  const auth = req.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export function requireDashboardKey(req, res, next) {
  const key = readApiKey(req);
  if (!key || key !== process.env.DASHBOARD_API_KEY) {
    return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
  }
  next();
}

export function requireInternalKey(req, res, next) {
  const key = req.get("X-Internal-Key");
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ ok: false, error: "UNAUTHORIZED_INTERNAL" });
  }
  next();
}
