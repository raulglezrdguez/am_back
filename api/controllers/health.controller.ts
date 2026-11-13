import { performance } from "node:perf_hooks";
import type { Request, Response } from "express";
import mongoose from "mongoose";
import admin from "../../config/admin.firebase.ts";
import { redisClient } from "../../middlewares/rateLimit.ts";
import { logger } from "../../middlewares/logger.ts";
import { lifecycle } from "../../config/lifecycle.ts";
import { dependencyUp, mongoReadyState } from "../../config/metrics.ts";
import {
  APP_VERSION,
  FIREBASE_CHECK_TTL_MS,
  HEALTHCHECK_TIMEOUT_MS,
  NODE_ENV,
} from "../../config/index.ts";
import { isFirebaseInitialized } from "../../config/admin.firebase.ts";
import {
  getAuditConnection,
  isAuditDbConfigured,
} from "../../config/auditDb.ts";

type DependencyStatus = "up" | "down" | "degraded" | "disabled";

type DependencyCheck = {
  status: DependencyStatus;
  latencyMs?: number;
  error?: string;
};

const withTimeout = async <T>(
  promise: Promise<T>,
  label: string,
): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label}_timeout`)),
          HEALTHCHECK_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const errorCode = (err: unknown): string => {
  if (err && typeof err === "object" && "name" in err) {
    return String((err as { name: unknown }).name);
  }
  return "ERROR";
};

const checkMongo = async (): Promise<DependencyCheck> => {
  const startedAt = performance.now();

  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return {
      status: "down",
      error: `readyState_${mongoose.connection.readyState}`,
    };
  }

  try {
    await withTimeout(mongoose.connection.db.admin().ping(), "mongo_ping");
    return {
      status: "up",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (err) {
    return {
      status: "down",
      latencyMs: Math.round(performance.now() - startedAt),
      error: errorCode(err),
    };
  }
};

const checkRedis = async (): Promise<DependencyCheck> => {
  if (!redisClient) {
    return NODE_ENV === "production"
      ? { status: "down", error: "not_connected" }
      : { status: "disabled" };
  }

  const startedAt = performance.now();

  if (!redisClient.isReady) {
    return { status: "down", error: "not_ready" };
  }

  try {
    await withTimeout(redisClient.ping(), "redis_ping");
    return {
      status: "up",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (err) {
    return {
      status: "down",
      latencyMs: Math.round(performance.now() - startedAt),
      error: errorCode(err),
    };
  }
};

let firebaseCache: { at: number; result: DependencyCheck } | null = null;

const checkFirebase = async (): Promise<DependencyCheck> => {
  if (NODE_ENV === "test") return { status: "disabled" };

  if (firebaseCache && Date.now() - firebaseCache.at < FIREBASE_CHECK_TTL_MS) {
    return firebaseCache.result;
  }

  const startedAt = performance.now();

  if (!isFirebaseInitialized()) {
    const result: DependencyCheck = {
      status: "down",
      error: "not_initialized",
    };
    firebaseCache = { at: Date.now(), result };
    return result;
  }

  try {
    await withTimeout(admin.auth().listUsers(1), "firebase_list_users");
    const result: DependencyCheck = {
      status: "up",
      latencyMs: Math.round(performance.now() - startedAt),
    };
    firebaseCache = { at: Date.now(), result };
    return result;
  } catch (err) {
    const result: DependencyCheck = {
      status: "degraded",
      latencyMs: Math.round(performance.now() - startedAt),
      error: errorCode(err),
    };
    firebaseCache = { at: Date.now(), result };
    return result;
  }
};

const checkAuditDb = async (): Promise<DependencyCheck> => {
  if (!isAuditDbConfigured()) return { status: "disabled" };

  const conn = getAuditConnection();
  if (!conn || conn.readyState !== 1 || !conn.db) {
    return {
      status: "down",
      error: conn ? `readyState_${conn.readyState}` : "not_connected",
    };
  }

  const startedAt = performance.now();

  try {
    await withTimeout(conn.db.admin().ping(), "audit_ping");
    return {
      status: "up",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (err) {
    return {
      status: "down",
      latencyMs: Math.round(performance.now() - startedAt),
      error: errorCode(err),
    };
  }
};

export const getLiveness = (_req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
  });
};

let lastFailureLogAt = 0;

export const getReadiness = async (req: Request, res: Response) => {
  if (lifecycle.shuttingDown) {
    return res.status(503).json({ status: "draining" });
  }

  const [mongo, redis, firebase, audit] = await Promise.all([
    checkMongo(),
    checkRedis(),
    checkFirebase(),
    checkAuditDb(),
  ]);

  dependencyUp.set({ dependency: "mongo" }, mongo.status === "up" ? 1 : 0);
  dependencyUp.set({ dependency: "redis" }, redis.status === "up" ? 1 : 0);
  dependencyUp.set(
    { dependency: "firebase" },
    firebase.status === "up" ? 1 : 0,
  );
  if (isAuditDbConfigured()) {
    dependencyUp.set({ dependency: "audit_db" }, audit.status === "up" ? 1 : 0);
  } else {
    // No inventar una serie "down" si la auditoría no está configurada:
    // dispararía AmBackAuditDbDown en local/staging.
    dependencyUp.remove({ dependency: "audit_db" });
  }
  mongoReadyState.set(mongo.status === "up" ? 1 : 0);

  // Redis no es crítico: el rate limit hace fail-open y tumbar todos los pods
  // convertiría una degradación parcial en una caída total.
  const criticalDown =
    mongo.status === "down" ||
    (audit.status === "down" && isAuditDbConfigured());
  const degraded =
    redis.status === "down" ||
    firebase.status === "down" ||
    firebase.status === "degraded";
  const status = criticalDown ? "error" : degraded ? "degraded" : "ok";

  if (criticalDown) res.setHeader("Retry-After", "5");

  if (criticalDown && Date.now() - lastFailureLogAt > 60_000) {
    lastFailureLogAt = Date.now();
    logger.error(
      { requestId: req.id, checks: { mongo, redis, firebase, audit } },
      "readiness_failed",
    );
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(criticalDown ? 503 : 200).json({
    status,
    uptime: process.uptime(),
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    checks: { mongo, redis, firebase, audit },
  });
};

/**
 * Alias legacy. Se mantiene para no romper clientes, pero ahora es readiness,
 * no un "ok" ciego.
 */
export const getHealth = getReadiness;
