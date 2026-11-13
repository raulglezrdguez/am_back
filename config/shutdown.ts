import type { Server } from "node:http";
import type { Logger } from "pino";
import { sanitizeError } from "../middlewares/logger.ts";

type MaybeApollo = { stop(): Promise<void> } | undefined;

export type ShutdownDeps = {
  getApollo: () => MaybeApollo;
  getHttp: () => Server | undefined;
  closeMongo: () => Promise<void>;
  quitRedis: () => Promise<void>;
  stopTelemetry: () => Promise<void>;
  logger: Pick<Logger, "info" | "warn" | "error" | "fatal" | "flush">;
  timeoutMs: number;
  exit: (code: number) => void;
  onShutdownStart?: () => void;
};

const closeHttp = (server: Server, timeoutMs: number): Promise<void> =>
  new Promise((resolve, reject) => {
    // Si quedan conexiones keep-alive activas, forzar su cierre antes de que
    // el timeout global mate el proceso con exit(1).
    const force = setTimeout(
      () => server.closeAllConnections?.(),
      Math.min(5_000, Math.max(500, Math.floor(timeoutMs / 2))),
    );
    force.unref?.();

    server.close((err) => {
      clearTimeout(force);
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

const step = async (
  label: string,
  fn: () => Promise<void>,
  logger: ShutdownDeps["logger"],
) => {
  try {
    await fn();
  } catch (err) {
    logger.error({ err: sanitizeError(err) }, label);
  }
};

export function createShutdownRunner(deps: ShutdownDeps) {
  let started = false;

  return async (signal: string, exitCode = 0): Promise<void> => {
    if (started) return;
    started = true;

    deps.onShutdownStart?.();
    deps.logger.info({ signal, exitCode }, "shutdown_started");

    const force = setTimeout(() => {
      deps.logger.fatal({ signal }, "shutdown_forced");
      deps.exit(1);
    }, deps.timeoutMs);
    force.unref?.();

    try {
      const apollo = deps.getApollo();
      if (apollo) {
        await step("apollo_stop_failed", () => apollo.stop(), deps.logger);
      }

      const http = deps.getHttp();
      if (http?.listening) {
        await step(
          "http_close_failed",
          () => closeHttp(http, deps.timeoutMs),
          deps.logger,
        );
      }

      await step("mongo_close_failed", deps.closeMongo, deps.logger);
      await step("redis_close_failed", deps.quitRedis, deps.logger);
      await step("telemetry_close_failed", deps.stopTelemetry, deps.logger);

      clearTimeout(force);
      deps.logger.info({ signal }, "shutdown_complete");
      await new Promise<void>((resolve) => deps.logger.flush(() => resolve()));
      deps.exit(exitCode);
    } catch (err) {
      deps.logger.fatal({ err: sanitizeError(err), signal }, "shutdown_failed");
      deps.exit(1);
    }
  };
}
