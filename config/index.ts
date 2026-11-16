import "./env.ts"; // dotenv.config() antes de leer process.env
import { z } from "zod";
import { logger } from "../middlewares/logger.ts";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const booleanFromEnv = z.preprocess(
  emptyToUndefined,
  z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
);

const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

const optionalString = z.preprocess(
  emptyToUndefined,
  z.string().min(1).optional(),
);

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
  OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrl,
  SENTRY_DSN: optionalUrl,
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  FIREBASE_SERVICE_ACCOUNT: optionalString,
  METRICS_HOST: z.string().default("127.0.0.1"),
  AUDIT_HOT_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  MONGO_AUDIT_URI: optionalUrl,
  AUDIT_WRITE_CONCERN: z
    .enum(["1", "majority"])
    .default("majority")
    // El driver espera 1 (número) o "majority"; "1" como string funciona,
    // pero es mejor normalizarlo para no depender del parser.
    .transform((value) => (value === "1" ? 1 : "majority")),
  AUDIT_ALLOW_SHARED_DB: booleanFromEnv,
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.fatal({ errors: parsed.error.flatten().fieldErrors }, "invalid_env");
  process.exit(1); // Aborta el arranque
}

// Sin DB dedicada, los eventos se escriben en la DB de la app con un usuario
// readWrite y el append-only queda solo en hooks de Mongoose (bypassables con
// el driver nativo). En producción eso no es aceptable.
if (
  parsed.data.NODE_ENV === "production" &&
  parsed.data.AUDIT_ALLOW_SHARED_DB !== true &&
  parsed.data.AUDIT_ENABLED !== false &&
  !parsed.data.MONGO_AUDIT_URI
) {
  logger.fatal(
    {
      hint: "Define MONGO_AUDIT_URI. Para una transición documentada: AUDIT_ALLOW_SHARED_DB=true",
    },
    "audit_db_required_in_production",
  );
  process.exit(1);
}

if (
  parsed.data.NODE_ENV === "production" &&
  parsed.data.AUDIT_ENABLED === false
) {
  logger.warn("audit_disabled_in_production");
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
  AUDIT_ALLOW_SHARED_DB,
} = parsed.data;

// Flag explícito calculado una sola vez
export const IS_PRODUCTION = NODE_ENV === "production";

// Puerto dinámico para tests
export const PORT = NODE_ENV === "test" ? 0 : ENV_PORT;

export const AUDIT_ENABLED = parsed.data.AUDIT_ENABLED ?? true;
// Fail-closed SIEMPRE por defecto, también en dev/staging.
// Para una reversión temporal documentada: AUDIT_FAIL_CLOSED=false.
export const AUDIT_FAIL_CLOSED = parsed.data.AUDIT_FAIL_CLOSED ?? true;
export const AUDIT_WRITE_CONCERN = parsed.data.AUDIT_WRITE_CONCERN;

// Precedencia documentada: si AUDIT_ENABLED=false no se escribe nada y
// AUDIT_FAIL_CLOSED no tiene efecto (no hay escritura que pueda fallar).
