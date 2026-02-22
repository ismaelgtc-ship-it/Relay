import { z } from "zod";
import "dotenv/config";

function pickEnv(...keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return "";
}

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DASHBOARD_API_KEY: z.string().min(16),
  INTERNAL_API_KEY: z.string().min(16),
  MONGODB_URI_GATEWAY: z.string().min(1),
  MONGODB_DB_GATEWAY: z.string().optional().or(z.literal(""))
});

const normalized = {
  PORT: pickEnv("PORT", "port"),
  DASHBOARD_API_KEY: pickEnv("DASHBOARD_API_KEY", "dashboard_api_key"),
  INTERNAL_API_KEY: pickEnv("INTERNAL_API_KEY", "internal_api_key"),
  MONGODB_URI_GATEWAY: pickEnv(
    "MONGODB_URI_GATEWAY",
    "MONGO_URI_GATEWAY",
    "MONGO_URI",
    "mongo_uri"
  ),
  MONGODB_DB_GATEWAY: pickEnv("MONGODB_DB_GATEWAY", "mongo_db_gateway")
};

export const env = EnvSchema.parse({ ...process.env, ...normalized });
