import dotenv from "dotenv";
import { z } from "zod";
import { logger } from "../middlewares/logger.ts";

dotenv.config();

const booleanFromEnv = z
  .enum(["true", "false"])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === "true"));

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(5050),
  MONGO_URI: z
    .string()
    .url("MONGO_URI must be a valid MongoDB connection string"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  REDIS_URL: z.string().url("REDIS_URL must be a valid Redis connection URL"),
  APP_VERSION: z.string().default("dev"),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  HEALTHCHECK_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
  FIREBASE_CHECK_TTL_MS: z.coerce.number().int().positive().default(30000),
  AUDIT_ENABLED: booleanFromEnv,
  AUDIT_FAIL_CLOSED: booleanFromEnv,
  AUDIT_RETENTION_DAYS: z.coerce.number().int().positive().default(2190),
  METRICS_PORT: z.coerce.number().int().positive().default(9464),
  METRICS_TOKEN: z.string().optional(),
  OTEL_ENABLED: booleanFromEnv,
  OTEL_SERVICE_NAME: z.string().default("am-back"),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  FIREBASE_SERVICE_ACCOUNT: z.string().min(1).optional(),
  METRICS_HOST: z.string().default("127.0.0.1"),
  AUDIT_HOT_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  MONGO_AUDIT_URI: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.fatal({ errors: parsed.error.flatten().fieldErrors }, "invalid_env");
  process.exit(1); // Aborta el arranque
}

export const {
  NODE_ENV,
  PORT: ENV_PORT,
  MONGO_URI,
  JWT_SECRET,
  FIREBASE_SERVICE_ACCOUNT,
  LOG_LEVEL,
  APP_VERSION,
  TRUST_PROXY,
  SHUTDOWN_TIMEOUT_MS,
  HEALTHCHECK_TIMEOUT_MS,
  FIREBASE_CHECK_TTL_MS,
  AUDIT_RETENTION_DAYS,
  METRICS_PORT,
  METRICS_TOKEN,
  OTEL_ENABLED,
  OTEL_SERVICE_NAME,
  OTEL_EXPORTER_OTLP_ENDPOINT,
  SENTRY_DSN,
  SENTRY_TRACES_SAMPLE_RATE,
  REDIS_URL,
  METRICS_HOST,
  AUDIT_HOT_RETENTION_DAYS,
  MONGO_AUDIT_URI,
} = parsed.data;

// Flag explícito calculado una sola vez
export const IS_PRODUCTION = NODE_ENV === "production";

// Puerto dinámico para tests
export const PORT = NODE_ENV === "test" ? 0 : ENV_PORT;

export const AUDIT_ENABLED = parsed.data.AUDIT_ENABLED ?? true;
export const AUDIT_FAIL_CLOSED =
  parsed.data.AUDIT_FAIL_CLOSED ?? parsed.data.NODE_ENV === "production";
