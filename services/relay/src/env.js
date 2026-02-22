import { z } from "zod";
import "dotenv/config";

// Normalize common env naming variants.
// Render env keys are case-sensitive; some setups use snake_case.
function pickEnv(...keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return "";
}

const EnvSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),

  // Accepted because ops may set it as `node_env`.
  NODE_ENV: z.string().optional().or(z.literal("")),

  /**
   * Optional: internal gateway (Overseer).
   * Leave unset to run Relay standalone.
   */
  GATEWAY_URL: z.string().url().optional().or(z.literal("")),
  INTERNAL_API_KEY: z.string().min(16).optional().or(z.literal("")),

  /**
   * Snapshot storage + API (used by Overseer puller).
   * If you leave these unset, Relay will still boot but snapshot features stay disabled.
   */
  MONGO_URI: z.string().min(1).optional().or(z.literal("")),
  // Supports legacy SNAPSHOT_API_KEY and the current INTERNAL_API_KEY.
  SNAPSHOT_API_KEY: z.string().min(16).optional().or(z.literal("")),
  GUILD_ID: z.string().min(1).optional().or(z.literal("")),
  SNAPSHOT_ENABLED: z.coerce.boolean().default(true),
  SNAPSHOT_INTERVAL_SEC: z.coerce.number().int().positive().default(60),

  /**
   * Intents are configurable to avoid disallowed privileged intents by default.
   * - ENABLE_GUILD_MESSAGES: enables GuildMessages intent
   * - ENABLE_MESSAGE_CONTENT: enables MessageContent (PRIVILEGED) intent
   */
  ENABLE_GUILD_MESSAGES: z.coerce.boolean().default(false),
  ENABLE_MESSAGE_CONTENT: z.coerce.boolean().default(false),

  // Render Web Services provide PORT; we also allow local/dev defaults.
  PORT: z.coerce.number().int().positive().default(10000),

  SERVICE_VERSION: z.string().default("0.0.0")
});

const normalized = {
  DISCORD_TOKEN: pickEnv("DISCORD_TOKEN", "discord_token"),

  GATEWAY_URL: pickEnv("GATEWAY_URL", "Gateway_url", "gateway_url"),
  INTERNAL_API_KEY: pickEnv("INTERNAL_API_KEY", "internal_api_key"),

  MONGO_URI: pickEnv("MONGO_URI", "mongo_uri"),
  GUILD_ID: pickEnv("GUILD_ID", "guild_id"),

  // Snapshot API key: if not provided explicitly, fall back to INTERNAL_API_KEY.
  SNAPSHOT_API_KEY:
    pickEnv("SNAPSHOT_API_KEY", "snapshot_api_key") || pickEnv("INTERNAL_API_KEY", "internal_api_key"),

  NODE_ENV: pickEnv("NODE_ENV", "node_env"),
  PORT: pickEnv("PORT", "port"),
  SERVICE_VERSION: pickEnv("SERVICE_VERSION", "service_version")
};

export const env = EnvSchema.parse({ ...process.env, ...normalized });
