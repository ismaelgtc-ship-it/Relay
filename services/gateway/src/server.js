import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { z } from "zod";

import { env } from "./env.js";
import { requireDashboardKey, requireInternalKey } from "./auth.js";
import { registerService, heartbeat, listServices } from "./store/registry.js";
import {
  listModuleStates,
  getModuleState,
  putModuleConfig,
  setModuleLock
} from "./store/modules.js";
import { writeAudit } from "./store/audit.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

app.get("/api/core/health", (_req, res) => {
  res.json({ ok: true, service: "gateway", ts: new Date().toISOString() });
});

function computeUp(services) {
  const now = Date.now();
  return services.map((s) => {
    const last = s.lastHeartbeatAt ? new Date(s.lastHeartbeatAt).getTime() : 0;
    return {
      service: s.service,
      version: s.version ?? "0.0.0",
      meta: s.meta ?? {},
      firstSeenAt: s.firstSeenAt,
      lastHeartbeatAt: s.lastHeartbeatAt,
      isUp: now - last <= 90_000
    };
  });
}

app.get("/api/core/public-status", async (_req, res) => {
  const services = await listServices();
  res.json({ ok: true, services: computeUp(services) });
});

app.get("/api/core/status", requireDashboardKey, async (_req, res) => {
  const services = await listServices();
  res.json({ ok: true, services: computeUp(services) });
});

// Dashboard → Gateway module control
app.get("/api/modules", requireDashboardKey, async (_req, res) => {
  const modules = await listModuleStates();
  res.json({ ok: true, modules });
});

app.get("/api/modules/:name", requireDashboardKey, async (req, res) => {
  const mod = await getModuleState(req.params.name);
  if (!mod) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  return res.json({ ok: true, module: mod });
});

const PutConfigSchema = z.object({
  active: z.boolean().optional(),
  config: z.record(z.any()).optional()
});

app.put("/api/modules/:name/config", requireDashboardKey, async (req, res) => {
  const parsed = PutConfigSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });

  const name = req.params.name;
  const updated = await putModuleConfig(name, parsed.data);
  if (!updated) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  await writeAudit({
    actor: "dashboard",
    action: "module.config.put",
    target: name,
    meta: { active: updated.active }
  });

  return res.json({ ok: true, module: updated });
});

const LockSchema = z.object({ reason: z.string().max(200).optional().default("") });

app.post("/api/modules/:name/lock", requireDashboardKey, async (req, res) => {
  const parsed = LockSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });

  const name = req.params.name;
  const updated = await setModuleLock(name, { locked: true, reason: parsed.data.reason });
  if (!updated) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  await writeAudit({
    actor: "dashboard",
    action: "module.lock",
    target: name,
    meta: { reason: parsed.data.reason }
  });

  return res.json({ ok: true, module: updated });
});

app.post("/api/modules/:name/unlock", requireDashboardKey, async (req, res) => {
  const name = req.params.name;
  const updated = await setModuleLock(name, { locked: false });
  if (!updated) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  await writeAudit({ actor: "dashboard", action: "module.unlock", target: name });
  return res.json({ ok: true, module: updated });
});

// Internal (Bots → Gateway)
app.post("/internal/register", requireInternalKey, async (req, res) => {
  const { service, version, meta } = req.body ?? {};
  if (!service || typeof service !== "string") {
    return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
  }

  await registerService(service, { version, meta });
  await writeAudit({
    actor: "internal",
    action: "service.register",
    target: service,
    meta: { version: version ?? "0.0.0" }
  });

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

app.get("/internal/module/:name", requireInternalKey, async (req, res) => {
  const mod = await getModuleState(req.params.name);
  if (!mod) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  return res.json({
    ok: true,
    name: mod.name,
    owner: mod.owner,
    active: mod.active,
    locked: mod.locked,
    config: mod.config
  });
});

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`[gateway] listening on :${env.PORT}`);
});
