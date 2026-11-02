import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(5050),
  MONGO_URI: z
    .string()
    .url("MONGO_URI must be a valid MongoDB connection string"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  FIREBASE_SERVICE_ACCOUNT: z
    .string()
    .min(1, "FIREBASE_SERVICE_ACCOUNT is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1); // Aborta el arranque
}

export const {
  NODE_ENV,
  PORT: ENV_PORT,
  MONGO_URI,
  JWT_SECRET,
  FIREBASE_SERVICE_ACCOUNT,
} = parsed.data;

// Flag explícito calculado una sola vez
export const IS_PRODUCTION = NODE_ENV === "production";

// Puerto dinámico para tests
export const PORT = NODE_ENV === "test" ? 0 : ENV_PORT;
