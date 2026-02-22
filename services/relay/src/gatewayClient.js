import { fetch } from "undici";

export async function gatewayRegister({ gatewayUrl, internalKey, version, meta } = {}) {
  if (!gatewayUrl || !internalKey) return false;

  const url = `${gatewayUrl.replace(/\/$/, "")}/internal/register`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-key": internalKey
    },
    body: JSON.stringify({ service: "realtime", version, meta })
  });

  return res.ok;
}

export async function gatewayHeartbeat({ gatewayUrl, internalKey } = {}) {
  if (!gatewayUrl || !internalKey) return false;

  const url = `${gatewayUrl.replace(/\/$/, "")}/internal/heartbeat`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-key": internalKey
    },
    body: JSON.stringify({ service: "realtime" })
  });

  return res.ok;
}

export async function gatewayGetModule({ gatewayUrl, internalKey, name } = {}) {
  if (!gatewayUrl || !internalKey) return null;

  const url = `${gatewayUrl.replace(/\/$/, "")}/internal/module/${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-internal-key": internalKey
    }
  });

  if (!res.ok) return null;
  return await res.json();
}
