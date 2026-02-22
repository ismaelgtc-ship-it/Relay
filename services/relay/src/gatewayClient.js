import { fetch } from "undici";

const GATEWAY_URL = process.env.GATEWAY_URL;
const INTERNAL_KEY = process.env.INTERNAL_API_KEY;

async function request(path) {
  if (!GATEWAY_URL || !INTERNAL_KEY) return;

  try {
    await fetch(`${GATEWAY_URL}${path}`, {
      method: "POST",
      headers: {
        "x-internal-key": INTERNAL_KEY
      }
    });
  } catch (err) {
    console.error("[relay] gateway error", err.message);
  }
}

export async function gatewayRegister() {
  await request("/register");
  console.log("[relay] registered with overseer");
}

export async function gatewayHeartbeat() {
  await request("/heartbeat");
}
