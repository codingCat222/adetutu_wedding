import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1),
  CLIENT_ORIGINS: z.string().default("http://localhost:5173"),
  ADMIN_JWT_SECRET: z.string().min(32, "ADMIN_JWT_SECRET must be at least 32 characters"),
  SESSION_TOKEN_SECRET: z.string().min(32, "SESSION_TOKEN_SECRET must be at least 32 characters"),
  ADMIN_SESSION_HOURS: z.coerce.number().positive().default(8),
  INVITATION_SESSION_MINUTES: z.coerce.number().positive().default(60),
  TRUST_PROXY: z.coerce.number().int().default(0),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) console.error(` - ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

export const config = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === "production",
  clientOrigins: parsed.data.CLIENT_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
};
