import "./instrumentation.ts"; // Sentry/OTel/dotenv primero

import * as Sentry from "@sentry/node";
import type { Server } from "node:http";
import type { ApolloServer } from "@apollo/server";
import mongoose from "mongoose";

import { connectDB } from "./config/db.ts";
import { PORT, SHUTDOWN_TIMEOUT_MS } from "./config/index.ts";
import { createServer } from "./app.ts";
import { logger, sanitizeError } from "./middlewares/logger.ts";
import { connectRedis, redisClient } from "./middlewares/rateLimit.ts";
import { startMetricsServer, stopMetricsServer } from "./config/metrics.ts";
import { shutdownTelemetry } from "./instrumentation.ts";
import { createShutdownRunner } from "./config/shutdown.ts";
import { lifecycle } from "./config/lifecycle.ts";
import type { ApolloContext } from "./config/apollo.context.ts";
import { connectAuditDB, closeAuditDB } from "./config/auditDb.ts";

let httpServer: Server | undefined;
let apolloServer: ApolloServer<ApolloContext> | undefined;

const shutdown = createShutdownRunner({
  getApollo: () => apolloServer,
  getHttp: () => httpServer,
  closeMongo: async () => {
    // Cerrar primero la auditoría y después la app, pase lo que pase.
    try {
      await closeAuditDB();
    } finally {
      await mongoose.connection.close(false);
    }
  },
  quitRedis: async () => {
    if (redisClient?.isOpen) await redisClient.quit();
  },
  stopTelemetry: async () => {
    await Promise.allSettled([stopMetricsServer(), shutdownTelemetry()]);
  },
  logger,
  timeoutMs: SHUTDOWN_TIMEOUT_MS,
  exit: (code) => process.exit(code),
  onShutdownStart: () => {
    lifecycle.shuttingDown = true;
  },
});

process.on("SIGTERM", () => void shutdown("SIGTERM", 0));
process.on("SIGINT", () => void shutdown("SIGINT", 0));

process.on("uncaughtException", (err) => {
  // No enviar el error original a Sentry: su mensaje puede contener PHI.
  const safe = new Error("uncaught_exception");
  safe.name = (err as any)?.name ?? "Error";
  Sentry.captureException(safe);
  logger.fatal({ err: sanitizeError(err) }, "uncaught_exception");
  void shutdown("uncaughtException", 1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: sanitizeError(reason) }, "unhandled_rejection");
  void shutdown("unhandledRejection", 1);
});

try {
  await connectDB();
} catch (err) {
  logger.fatal({ err: sanitizeError(err) }, "mongo_initial_connect_failed");
  process.exit(1);
}

// La auditoría es fail-closed: si está configurada y no se puede conectar,
// la app no debe servir PHI. Mejor un crashloop visible que un 100 % de 503
// silenciosos (y, con maxUnavailable=0, los pods antiguos siguen sirviendo).
try {
  await connectAuditDB();
} catch (err) {
  logger.fatal({ err: sanitizeError(err) }, "audit_db_initial_connect_failed");
  process.exit(1);
}

try {
  await connectRedis();
} catch (err) {
  // No tumbar el proceso: readiness queda 503 y el rate limit pasa a
  // fail-open (passOnStoreError). El cliente sigue reintentando.
  logger.error({ err: sanitizeError(err) }, "redis_initial_connect_failed");
}

const server = await createServer();
httpServer = server.httpServer;
apolloServer = server.apolloServer;

httpServer.on("error", (err) => {
  logger.fatal({ err: sanitizeError(err) }, "http_server_error");
  void shutdown("http_server_error", 1);
});

httpServer.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      env: process.env.NODE_ENV ?? "development",
      version: process.env.APP_VERSION ?? "dev",
    },
    "server_started",
  );
});

startMetricsServer().catch((err) => {
  logger.error({ err: sanitizeError(err) }, "metrics_server_failed");
});
