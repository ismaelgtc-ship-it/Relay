import { request } from "undici";

export async function gatewayRegister({ gatewayUrl, internalKey, service, version, meta }) {
  const res = await request(`${gatewayUrl}/internal/register`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Internal-Key": internalKey
    },
    body: JSON.stringify({ service, version, meta })
  });
  return res;
}

export async function gatewayHeartbeat({ gatewayUrl, internalKey, service }) {
  const res = await request(`${gatewayUrl}/internal/heartbeat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Internal-Key": internalKey
    },
    body: JSON.stringify({ service })
  });
  return res;
}

export async function gatewayGetModule({ gatewayUrl, internalKey, name }) {
  const res = await request(`${gatewayUrl}/internal/module/${encodeURIComponent(name)}`, {
    method: "GET",
    headers: {
      "X-Internal-Key": internalKey
    }
  });
  const data = await res.body.json().catch(() => null);
  return { statusCode: res.statusCode, data };
}
