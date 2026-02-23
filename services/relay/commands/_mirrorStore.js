import { env } from "../src/env.js";
import { gatewayGetModule, gatewaySetModuleConfig } from "../src/gatewayClient.js";

export async function fetchMirrorModule() {
  const { statusCode, data } = await gatewayGetModule({
    gatewayUrl: env.GATEWAY_URL,
    internalKey: env.INTERNAL_API_KEY,
    name: "mirror"
  });
  if (statusCode !== 200 || !data?.ok) return null;
  return data;
}

export async function saveMirrorConfig({ active, config }) {
  const { statusCode, data } = await gatewaySetModuleConfig({
    gatewayUrl: env.GATEWAY_URL,
    internalKey: env.INTERNAL_API_KEY,
    name: "mirror",
    active,
    config
  });

  if (statusCode !== 200 || !data?.ok) {
    return { ok: false, statusCode, data };
  }
  return { ok: true, module: data.module };
}

export function normalizeGroups(cfg) {
  const groups = Array.isArray(cfg?.groups) ? cfg.groups : [];
  return groups
    .filter((g) => g && typeof g.name === "string")
    .map((g) => ({
      name: g.name,
      channels: g.channels && typeof g.channels === "object" ? g.channels : {}
    }));
}

export function formatMirrorSaveError(res) {
  // res: { ok:false, statusCode, data }
  const code = Number(res?.statusCode || 0);
  const err = res?.data?.error ? String(res.data.error) : "";

  if (!code) return "Gateway unreachable or network error.";
  if (code === 401) return "Gateway auth failed (INTERNAL_API_KEY mismatch).";
  if (code === 404) return "Gateway endpoint not found (GATEWAY_URL points to wrong service).";

  if (code === 400) {
    if (err === "MODULE_LOCKED") return "Mirror module is locked. Unlock it in the dashboard first.";
    if (err) return `Gateway rejected the request (${err}).`;
    return "Gateway rejected the request (BAD_REQUEST).";
  }

  if (err) return `Gateway error (${code}: ${err}).`;
  return `Gateway error (${code}).`;
}
