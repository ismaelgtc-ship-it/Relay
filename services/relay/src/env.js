import { z } from "zod";
import "dotenv/config";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(10000),
  DISCORD_TOKEN: z.string().min(20),
  CLIENT_ID: z.string().min(5),
  GUILD_ID: z.string().min(5),

  // Gateway
  GATEWAY_URL: z.string().url(),
  INTERNAL_API_KEY: z.string().min(16),

  // Snapshot endpoint auth
  SNAPSHOT_API_KEY: z.string().min(16)
});

export const env = EnvSchema.parse(process.env);
