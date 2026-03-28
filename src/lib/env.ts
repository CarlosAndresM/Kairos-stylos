import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default("localhost"),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("kairos_stylos"),
  DB_PORT: z.string().default("3306"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  JWT_SECRET: z.string().default("kairos_stylos_secret_key_2026_secure_random_string"),
  DB_TIMEZONE: z.string().default("UTC"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
