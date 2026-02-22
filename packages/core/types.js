/**
 * Shared types/schemas for cross-service contracts.
 * Keep this file platform-agnostic (no discord.js / express imports).
 */

import { z } from "zod";
import { MODULE_MANIFEST } from "./moduleManifest.js";

export const ModuleNameSchema = z.enum(Object.keys(MODULE_MANIFEST));

export const ModuleStateSchema = z.object({
  name: ModuleNameSchema,
  owner: z.enum(["realtime", "heavy"]),
  active: z.boolean(),
  locked: z.boolean(),
  config: z.record(z.any()).default({})
});

export const ServiceNameSchema = z.enum(["gateway", "realtime", "heavy"]);
