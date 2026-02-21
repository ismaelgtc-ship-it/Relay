import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./env.js";
import { requireDashboardKey, requireInternalKey } from "./auth.js";
import { registerService, heartbeat, listServices } from "./registry.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

app.get("/api/core/health", (_req, res) => {
  res.json({ ok: true, service: "gateway", ts: new Date().toISOString() });
});

app.get("/api/core/public-status", (_req, res) => {
  const now = Date.now();
  const services = listServices().map((s) => ({
    ...s,
    isUp: now - s.lastHeartbeatAt <= 90_000
  }));
  res.json({ ok: true, services });
});

app.get("/api/core/status", requireDashboardKey, (_req, res) => {
  const now = Date.now();
  const services = listServices().map((s) => ({
    ...s,
    isUp: now - s.lastHeartbeatAt <= 90_000
  }));
  res.json({ ok: true, services });
});

app.post("/internal/register", requireInternalKey, (req, res) => {
  const { service, version, meta } = req.body ?? {};
  if (!service || typeof service !== "string") {
    return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
  }
  registerService(service, { version, meta });
  return res.json({ ok: true });
});

app.post("/internal/heartbeat", requireInternalKey, (req, res) => {
  const { service } = req.body ?? {};
  if (!service || typeof service !== "string") {
    return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
  }
  const ok = heartbeat(service);
  if (!ok) return res.status(404).json({ ok: false, error: "NOT_REGISTERED" });
  return res.json({ ok: true });
});

app.listen(env.PORT, () => {
  console.log(`[gateway] listening on :${env.PORT}`);
});
