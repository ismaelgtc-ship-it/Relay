import { z } from "zod";
import "dotenv/config";

const EnvSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),

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

export const env = EnvSchema.parse(process.env);
