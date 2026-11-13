import "./instrumentation.ts"; // Sentry/OTel primero

import * as Sentry from "@sentry/node";
import type { Server } from "node:http";
import type { ApolloServer } from "@apollo/server";
import mongoose from "mongoose";

import { connectDB } from "./config/db.ts";
import { PORT, SHUTDOWN_TIMEOUT_MS } from "./config/index.ts";
import { createServer } from "./app.ts";
import { logger } from "./middlewares/logger.ts";
import { connectRedis, redisClient } from "./middlewares/rateLimit.ts";
import { startMetricsServer, stopMetricsServer } from "./config/metrics.ts";
import { shutdownTelemetry } from "./instrumentation.ts";
import { lifecycle } from "./config/lifecycle.ts";
import type { ApolloContext } from "./config/apollo.context.ts";

let httpServer: Server | undefined;
let apolloServer: ApolloServer<ApolloContext> | undefined;

const closeHttpServer = (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((err) => {
      if (
        err &&
        (err as NodeJS.ErrnoException).code !== "ERR_SERVER_NOT_RUNNING"
      ) {
        reject(err);
        return;
      }
      resolve();
    });

    // Acelera el cierre de conexiones keep-alive inactivas.
    server.closeIdleConnections?.();
  });

const shutdown = async (signal: string, exitCode = 0): Promise<void> => {
  if (lifecycle.shuttingDown) return;
  lifecycle.shuttingDown = true;

  logger.info({ signal, exitCode }, "shutdown_started");

  const force = setTimeout(() => {
    logger.fatal({ signal }, "shutdown_forced");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  force.unref();

  try {
    // 1. Apollo: dispara drainHttpServer y deja de aceptar GraphQL.
    try {
      if (apolloServer) await apolloServer.stop();
    } catch (err) {
      logger.error({ err }, "apollo_stop_failed");
    }

    // 2. HTTP: cierra REST y conexiones keep-alive restantes.
    try {
      if (httpServer?.listening) await closeHttpServer(httpServer);
    } catch (err) {
      logger.error({ err }, "http_close_failed");
    }

    // 3. Mongo después de que no queden peticiones en vuelo.
    try {
      await mongoose.connection.close(false);
    } catch (err) {
      logger.error({ err }, "mongo_close_failed");
    }

    // 4. Redis.
    try {
      if (redisClient?.isOpen) await redisClient.quit();
    } catch (err) {
      logger.error({ err }, "redis_close_failed");
    }

    // 5. Telemetría y métricas.
    await Promise.allSettled([stopMetricsServer(), shutdownTelemetry()]);

    clearTimeout(force);
    logger.info({ signal }, "shutdown_complete");
    await new Promise<void>((resolve) => logger.flush(() => resolve()));
    process.exit(exitCode);
  } catch (err) {
    logger.fatal({ err, signal }, "shutdown_failed");
    process.exit(1);
  }
};

process.on("SIGTERM", () => void shutdown("SIGTERM", 0));
process.on("SIGINT", () => void shutdown("SIGINT", 0));

process.on("uncaughtException", (err) => {
  Sentry.captureException(err);
  logger.fatal({ err }, "uncaught_exception");
  void shutdown("uncaughtException", 1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "unhandled_rejection");
  void shutdown("unhandledRejection", 1);
});

try {
  await connectDB();
} catch (err) {
  logger.fatal({ err }, "mongo_initial_connect_failed");
  process.exit(1);
}

try {
  await connectRedis();
} catch (err) {
  // No tumbar el proceso: readiness queda 503 y el rate limit puede pasar
  // a fail-open si se configuró passOnStoreError.
  logger.error({ err }, "redis_initial_connect_failed");
}

const server = await createServer();
httpServer = server.httpServer;
apolloServer = server.apolloServer;

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
  logger.error({ err }, "metrics_server_failed");
});
