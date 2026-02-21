import { z } from "zod";
import "dotenv/config";

const EnvSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  GATEWAY_URL: z.string().url(),
  INTERNAL_API_KEY: z.string().min(16),
  SERVICE_VERSION: z.string().default("0.0.0")
});

export const env = EnvSchema.parse(process.env);
