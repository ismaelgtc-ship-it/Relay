import { z } from "zod";
import "dotenv/config";

// Backward/interop env aliasing
// Other services use MONGO_URI; gateway historically used MONGODB_URI.
// Accept both to avoid deploy-time misconfiguration.
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI =
    process.env.MONGO_URI ||
    process.env.MONGO_URL ||
    process.env.DATABASE_URL ||
    process.env.MONGODB_URI;
}

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DASHBOARD_API_KEY: z.string().min(16),
  INTERNAL_API_KEY: z.string().min(16),
  MONGODB_URI: z.string().min(10),
  MONGODB_DB: z.string().min(1).default("devilwolf")
});

export const env = EnvSchema.parse(process.env);
