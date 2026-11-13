import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { createClient, type RedisClientType } from "redis";
import type { Request, Response } from "express";

import { logger, sanitizeError } from "./logger.ts";
import { NODE_ENV, REDIS_URL } from "../config/index.ts";
import { rateLimitExceededTotal } from "../config/metrics.ts";
import { writeAuditEvent } from "../services/audit.service.ts";

export let redisClient: RedisClientType | null = null;

/**
 * Conecta Redis una sola vez. No lanza en producción si falla: el servicio
 * arranca degradado (readiness 503) en lugar de caerse por completo.
 */
export async function connectRedis(): Promise<void> {
  if (NODE_ENV === "test") return; // memoria
  if (redisClient) return;

  const client = createClient({
    url: REDIS_URL,
    socket: {
      connectTimeout: 2_000,
      reconnectStrategy: (retries) =>
        Math.min(200 * 2 ** Math.min(retries, 4), 3_000),
    },
  });

  client.on("error", (err) =>
    logger.error({ err: sanitizeError(err) }, "redis_error"),
  );
  client.on("ready", () => logger.info("redis_ready"));
  client.on("end", () => logger.warn("redis_end"));
  client.on("reconnecting", () => logger.warn("redis_reconnecting"));

  await client.connect();
  redisClient = client;
}

const storeFor = (prefix: string) =>
  redisClient
    ? new RedisStore({
        sendCommand: (...args: string[]) => redisClient!.sendCommand(args),
        prefix,
      })
    : undefined;

/**
 * Handler compartido: métrica + log + evento de auditoría de seguridad.
 * No incluye la URL ni el body; solo método, ruta normalizada y sujeto.
 */
const onLimitReached =
  (scope: "global" | "graphql" | "operation") =>
  (req: Request, res: Response) => {
    rateLimitExceededTotal.inc({ scope });

    const userId = req.user?.id ?? null;

    req.log?.warn(
      {
        requestId: req.id,
        userId,
        scope,
        method: req.method,
        path: req.path,
        statusCode: 429,
      },
      "rate_limit_exceeded",
    );

    void writeAuditEvent(
      {
        operation: "rate_limit",
        operationType: "system",
        resourceType: "Security",
        result: "denied",
        reason: "RATE_LIMITED",
        metadata: { method: req.method, tokenType: scope },
      },
      {
        requestId: req.id,
        userId,
        userRole: req.user?.role ?? null,
        ip: req.ip ?? null,
        userAgent: req.headers["user-agent"]?.slice(0, 256) ?? null,
      },
      { failClosed: false },
    ).catch(() => undefined);
  };

const skipHealth = (req: Request) => req.path.startsWith("/api/health");

export function createRateLimitMiddlewares() {
  const rateLimitMiddleware = rateLimit({
    windowMs: 60 * 1000,
    limit: NODE_ENV === "test" ? 100_000 : 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ipv6Subnet: 56,
    store: storeFor("rl:global:"),
    // Si Redis falla, no se bloquea el servicio entero; se alerta por log/métrica.
    passOnStoreError: true,
    skip: (req) => NODE_ENV === "test" || skipHealth(req),
    handler: (req, res, _next, options) => {
      onLimitReached("global")(req, res);
      res.status(options.statusCode).json(options.message);
    },
    message: { error: "Too many requests, try again later." },
  });

  const graphqlRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: NODE_ENV === "test" ? 100_000 : 200,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => {
      const userId = req.user?.id;
      if (userId) return `u:${userId}`;
      return req.ip ? `ip:${ipKeyGenerator(req.ip)}` : "unknown";
    },
    store: storeFor("rl:user:"),
    passOnStoreError: true,
    skip: () => NODE_ENV === "test",
    handler: (req, res, _next, options) => {
      onLimitReached("graphql")(req, res);
      res.status(options.statusCode).json(options.message);
    },
    message: { error: "Too many requests, try again later." },
  });

  return { rateLimitMiddleware, graphqlRateLimit };
}
