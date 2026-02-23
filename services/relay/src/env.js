import { z } from "zod";
import "dotenv/config";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(10000),

  // Discord
  DISCORD_TOKEN: z.string().min(20),
  CLIENT_ID: z.string().min(5),
  GUILD_ID: z.string().min(5),

  // Gateway (internal)
  GATEWAY_URL: z.string().url(),
  INTERNAL_API_KEY: z.string().min(16),

  // Snapshot endpoint auth (Overseer puller)
  SNAPSHOT_API_KEY: z.string().min(0).default(""),

  // Optional Mongo (preferences, OCR logs, snapshots)
  MONGO_URI: z.string().optional(),
  MONGO_DB: z.string().optional().default("devilwolf"),

  // Optional dashboard API (Warroom -> Relay)
  DASHBOARD_API_KEY: z.string().optional(),

  // Optional: limit members/channels payload size
  DASHBOARD_MAX_MEMBERS: z.coerce.number().int().min(50).max(5000).optional().default(2000),

  // Google Calendar sync (optional)
  GOOGLE_CALENDAR_ID: z.string().optional(),
  // Service account JSON (raw JSON string or base64 encoded JSON)
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  // Discord channel where calendar events are announced
  CALENDAR_ANNOUNCE_CHANNEL_ID: z.string().optional(),
  CALENDAR_LOOKAHEAD_DAYS: z.coerce.number().int().min(1).max(365).optional().default(30),
  CALENDAR_POLL_INTERVAL_SEC: z.coerce.number().int().min(15).max(3600).optional().default(60),
  CALENDAR_TIMEZONE: z.string().optional().default("Europe/Madrid")
});

export const env = EnvSchema.parse(process.env);

// Convenience: accept legacy names without breaking other services
if (!env.MONGO_URI) {
  // eslint-disable-next-line no-empty
}
