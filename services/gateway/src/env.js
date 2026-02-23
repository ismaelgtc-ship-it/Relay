import { z } from "zod";
import "dotenv/config";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DASHBOARD_API_KEY: z.string().min(16),
  INTERNAL_API_KEY: z.string().min(16),
  MONGODB_URI: z.string().min(10),
  MONGODB_DB: z.string().min(1).default("devilwolf")
});

export const env = EnvSchema.parse(process.env);
