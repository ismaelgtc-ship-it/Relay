import { gatewayGetModule } from "../gatewayClient.js";
import { env } from "../env.js";

const REALTIME_MODULES = ["mirror", "calendar", "embedpro", "user_language"]; 

export async function pullRealtimeModuleStates() {
  const gatewayUrl = env.GATEWAY_URL;
  const internalKey = env.INTERNAL_API_KEY;
  if (!gatewayUrl || !internalKey) return {};

  const out = {};
  for (const name of REALTIME_MODULES) {
    const s = await gatewayGetModule({ gatewayUrl, internalKey, name }).catch(() => null);
    if (s?.ok) out[name] = s;
  }
  return out;
}

export function isModuleRunnable(state) {
  if (!state?.ok) return false;
  return Boolean(state.active) && !Boolean(state.locked);
}
