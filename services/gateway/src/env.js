import { z } from "zod";
import "dotenv/config";

// Backward-compatible Mongo env: allow MONGO_URI (used by other services)
// while keeping MONGODB_URI as the canonical variable.
const mongoUri =
  process.env.MONGODB_URI ??
  process.env.MONGO_URI ??
  process.env.MONGO_URL ??
  process.env.DATABASE_URL;

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DASHBOARD_API_KEY: z.string().min(16),
  INTERNAL_API_KEY: z.string().min(16),
  // Validate the resolved mongo URI (not the raw env var)
  MONGODB_URI: z.string().min(10),
  MONGODB_DB: z.string().min(1).default("devilwolf"),
});

export const env = EnvSchema.parse({
  ...process.env,
  MONGODB_URI: mongoUri,
});
