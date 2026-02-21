import { request } from "undici";
import { env } from "./env.js";

function url(path) {
  return new URL(path, env.GATEWAY_URL).toString();
}

export async function gatewayRegister() {
  const res = await request(url("/internal/register"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-key": env.INTERNAL_API_KEY
    },
    body: JSON.stringify({
      service: "relay",
      version: env.SERVICE_VERSION,
      meta: { platform: "render" }
    })
  });
  const json = await res.body.json().catch(() => ({}));
  if (res.statusCode >= 400) throw new Error(`gateway register failed: ${res.statusCode} ${JSON.stringify(json)}`);
  return json;
}

export async function gatewayHeartbeat() {
  const res = await request(url("/internal/heartbeat"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-key": env.INTERNAL_API_KEY
    },
    body: JSON.stringify({ service: "relay" })
  });
  const json = await res.body.json().catch(() => ({}));
  if (res.statusCode >= 400) throw new Error(`gateway heartbeat failed: ${res.statusCode} ${JSON.stringify(json)}`);
  return json;
}
