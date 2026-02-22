import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./env.js";
import { requireDashboardKey, requireInternalKey } from "./auth.js";
import { registerService, heartbeat, listServices } from "./registry.js";
import { listModules, getModule, setModuleConfig, lockModule, unlockModule } from "./modulesStore.js";
import { isKnownModule } from "./moduleManifest.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

// Render health checks (no auth)
app.get(["/", "/healthz"], (_req, res) => {
  res.json({ ok: true, service: "gateway", ts: new Date().toISOString() });
});

// Contract health (Dashboard -> Gateway) requires API key
app.get("/api/core/health", requireDashboardKey, (_req, res) => {
  res.json({ ok: true, service: "gateway", ts: new Date().toISOString() });
});

app.get("/api/core/status", requireDashboardKey, async (_req, res) => {
  const now = Date.now();
  const services = (await listServices()).map((s) => ({
    ...s,
    isUp: now - (s.lastHeartbeatAt ?? 0) <= 90_000
  }));
  res.json({ ok: true, services });
});

// Modules (Dashboard -> Gateway)
app.get("/api/modules", requireDashboardKey, async (_req, res) => {
  const modules = await listModules();
  res.json({ ok: true, modules });
});

app.get("/api/modules/:name", requireDashboardKey, async (req, res) => {
  const name = String(req.params.name);
  const mod = await getModule(name);
  if (!mod) return res.status(404).json({ ok: false, error: "UNKNOWN_MODULE" });
  return res.json({ ok: true, module: mod });
});

app.put("/api/modules/:name/config", requireDashboardKey, async (req, res) => {
  const name = String(req.params.name);
  if (!isKnownModule(name)) return res.status(404).json({ ok: false, error: "UNKNOWN_MODULE" });
  const { active, config } = req.body ?? {};
  const result = await setModuleConfig(name, { active, config }, "dashboard");
  if (!result.ok) return res.status(400).json({ ok: false, error: result.error, details: result.details });
  const mod = await getModule(name);
  return res.json({ ok: true, module: mod });
});

app.post("/api/modules/:name/lock", requireDashboardKey, async (req, res) => {
  const name = String(req.params.name);
  const result = await lockModule(name, "dashboard");
  if (!result.ok) return res.status(404).json({ ok: false, error: result.error });
  const mod = await getModule(name);
  return res.json({ ok: true, module: mod });
});

app.post("/api/modules/:name/unlock", requireDashboardKey, async (req, res) => {
  const name = String(req.params.name);
  const result = await unlockModule(name, "dashboard");
  if (!result.ok) return res.status(404).json({ ok: false, error: result.error });
  const mod = await getModule(name);
  return res.json({ ok: true, module: mod });
});

app.post("/internal/register", requireInternalKey, async (req, res) => {
  const { service, version, meta } = req.body ?? {};
  if (!service || typeof service !== "string") {
    return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
  }
  await registerService(service, { version, meta });
  return res.json({ ok: true });
});

app.post("/internal/heartbeat", requireInternalKey, async (req, res) => {
  const { service } = req.body ?? {};
  if (!service || typeof service !== "string") {
    return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
  }
  const ok = await heartbeat(service);
  if (!ok) return res.status(404).json({ ok: false, error: "NOT_REGISTERED" });
  return res.json({ ok: true });
});

// Module state (Bots -> Gateway)
app.get("/internal/module/:name", requireInternalKey, async (req, res) => {
  const name = String(req.params.name);
  const mod = await getModule(name);
  if (!mod) return res.status(404).json({ ok: false, error: "UNKNOWN_MODULE" });
  return res.json({ ok: true, ...mod });
});

// Error boundary
app.use((err, _req, res, _next) => {
  console.error("[gateway] unhandled", err);
  res.status(500).json({ ok: false, error: "INTERNAL_ERROR" });
});

app.listen(env.PORT, () => {
  console.log(`[gateway] listening on :${env.PORT}`);
});
