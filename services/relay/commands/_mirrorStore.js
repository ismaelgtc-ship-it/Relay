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
