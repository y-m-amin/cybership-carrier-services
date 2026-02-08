import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  UPS_BASE_URL: z.string().url(),
  UPS_RATE_VERSION: z.string().default("v2409"),
  UPS_CLIENT_ID: z.string().min(1),
  UPS_CLIENT_SECRET: z.string().min(1),
  UPS_OAUTH_TOKEN_PATH: z.string().min(1).default("/security/v1/oauth/token"),
  HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
});

export const env = EnvSchema.parse(process.env);
export type Env = typeof env;
