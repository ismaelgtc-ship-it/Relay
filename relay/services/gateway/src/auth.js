export function requireDashboardKey(req, res, next) {
  const key = req.get("X-API-Key");
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
