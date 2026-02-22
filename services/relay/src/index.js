import { Client, GatewayIntentBits, Partials, Events } from "discord.js";
import { env } from "./env.js";
import { startHttpServer } from "./http/server.js";
import { startSnapshotLoop } from "./snapshot/runner.js";
import { gatewayRegister, gatewayHeartbeat } from "./gatewayClient.js";
import { pullRealtimeModuleStates, isModuleRunnable } from "./modules/index.js";
import { createMirrorRuntime } from "./modules/mirror/index.js";

console.log("[relay] boot", { version: env.SERVICE_VERSION });

const intents = [GatewayIntentBits.Guilds];
if (env.ENABLE_GUILD_MESSAGES) intents.push(GatewayIntentBits.GuildMessages);
if (env.ENABLE_MESSAGE_CONTENT) intents.push(GatewayIntentBits.MessageContent);

const client = new Client({ intents, partials: [Partials.Channel] });

// Always start HTTP server (health + optional snapshot API)
startHttpServer({ client });

// Module state cache
let moduleStates = {};
const mirror = createMirrorRuntime({
  client,
  getState: () => moduleStates.mirror
});
mirror.bind();

async function setupGatewayLoop() {
  const canGateway = Boolean(env.GATEWAY_URL) && Boolean(env.INTERNAL_API_KEY);
  if (!canGateway) {
    console.log("[relay] gateway disabled (no GATEWAY_URL / INTERNAL_API_KEY)");
    return;
  }

  const ok = await gatewayRegister({
    gatewayUrl: env.GATEWAY_URL,
    internalKey: env.INTERNAL_API_KEY,
    version: env.SERVICE_VERSION,
    meta: { node: process.version }
  }).catch(() => false);

  console.log("[relay] gatewayRegister", { ok });

  setInterval(() => {
    gatewayHeartbeat({ gatewayUrl: env.GATEWAY_URL, internalKey: env.INTERNAL_API_KEY }).catch(() => {});
  }, 30_000);
}

async function setupModulePoller() {
  const canGateway = Boolean(env.GATEWAY_URL) && Boolean(env.INTERNAL_API_KEY);
  if (!canGateway) return;

  let last = {};

  async function tick() {
    const states = await pullRealtimeModuleStates().catch(() => ({}));

    // log transitions
    for (const [name, state] of Object.entries(states)) {
      const prev = last[name];
      const nowRunnable = isModuleRunnable(state);
      const prevRunnable = prev ? isModuleRunnable(prev) : null;

      if (prevRunnable === null || prevRunnable !== nowRunnable) {
        console.log("[relay] module", name, {
          runnable: nowRunnable,
          active: state.active,
          locked: state.locked
        });
      }
    }

    moduleStates = states;
    last = states;
  }

  await tick();
  setInterval(tick, 20_000);
}

client.once(Events.ClientReady, async () => {
  console.log("[relay] ready", { user: client.user?.tag });

  // Optional: periodic snapshots for Overseer to pull
  startSnapshotLoop({ client });

  await setupGatewayLoop();
  await setupModulePoller();
});

client.login(env.DISCORD_TOKEN);
