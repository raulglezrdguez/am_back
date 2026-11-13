import "../config/env.ts"; // PRIMERO: LOG_LEVEL/APP_VERSION de .env
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import pino, { type Logger } from "pino";
import { trace } from "@opentelemetry/api";
import type { NextFunction, Request, Response } from "express";

const TRUST_PROXY = process.env.TRUST_PROXY
  ? Number(process.env.TRUST_PROXY)
  : 0;
const REQUEST_ID_RE = /^[A-Za-z0-9._-]{8,128}$/;

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: {
    service: process.env.OTEL_SERVICE_NAME ?? "am-back",
    env: process.env.NODE_ENV ?? "development",
    version: process.env.APP_VERSION ?? "dev",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redacción defensiva: aunque hoy no logueamos req/body, evita fugas futuras.
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['x-api-key']",
      "res.headers['set-cookie']",
      "body",
      "variables",
      "query",
    ],
    censor: "[REDACTED]",
  },
  // Correlación log ↔ traza sin acoplar el logger a OTel.
  mixin() {
    const span = trace.getActiveSpan();
    if (!span) return {};
    const { traceId, spanId } = span.spanContext();
    return { traceId, spanId };
  },
});

/**
 * Genera o propaga un request id seguro.
 * - Acepta x-request-id de un proxy/edge de confianza solo si tiene formato seguro.
 * - Devuelve siempre el id en la respuesta para soporte.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const incoming = req.headers["x-request-id"];
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
  const requestId =
    TRUST_PROXY > 0 && candidate && REQUEST_ID_RE.test(candidate)
      ? candidate
      : randomUUID();

  req.id = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}

/**
 * Log de una sola línea al finalizar la petición.
 * No loguea body, query string, variables ni headers sensibles.
 */
export function loggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const startedAt = performance.now();
  req.log = logger.child({ requestId: req.id });

  let logged = false;
  const writeLog = () => {
    if (logged) return;
    logged = true;

    const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
    const payload = {
      method: req.method,
      path: req.path, // sin query string
      statusCode: res.statusCode,
      durationMs,
      userId: req.user?.id ?? null,
      userRole: req.user?.role ?? null,
      ip: req.ip ?? null,
      userAgent: req.headers["user-agent"]?.slice(0, 256) ?? null,
    };

    if (res.statusCode >= 500) req.log.error(payload, "http_request");
    else if (res.statusCode >= 400) req.log.warn(payload, "http_request");
    else req.log.info(payload, "http_request");
  };

  res.on("finish", writeLog);
  res.on("close", writeLog); // peticiones abortadas
  next();
}

/**
 * Saneado de errores para logs. No incluye valores de Mongoose ni payloads.
 */
export function sanitizeError(err: unknown): Record<string, unknown> {
  if (!err || typeof err !== "object") return { type: "UnknownError" };

  const e = err as any;
  const base: Record<string, unknown> = {
    type: e.name ?? "Error",
    code: e.code ?? undefined,
  };

  // Errores operacionales propios: el mensaje está diseñado para ser seguro.
  if (e.isOperational && typeof e.message === "string") {
    base.message = e.message.slice(0, 300);
  }

  // Mongoose ValidationError: solo nombres de campos, nunca valores.
  if (e.name === "ValidationError" && e.errors) {
    base.fields = Object.keys(e.errors);
  }

  // Duplicate key: el mensaje puede contener el valor duplicado (email, identifier).
  if (e.name === "MongoServerError" && e.code === 11000) {
    base.message = "duplicate_key";
  }

  // El stack de V8 empieza por "Error: <mensaje>". Ese mensaje puede contener
  // PHI (nombre de paciente, identificador, etc.). Por defecto NO se emite.
  // Si se necesita para depurar, se habilita con LOG_ERROR_STACK=1 y se
  // elimina la primera línea.
  if (e.stack && process.env.LOG_ERROR_STACK === "1") {
    base.stack = String(e.stack)
      .split("\n")
      .slice(1) // fuera "Error: <mensaje>"
      .slice(0, 20) // máximo 20 frames
      .join("\n")
      .slice(0, 4000);
  }

  return base;
}
