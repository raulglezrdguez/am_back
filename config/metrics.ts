import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";
import { createServer, type Server } from "node:http";
import { performance } from "node:perf_hooks";
import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logger, sanitizeError } from "../middlewares/logger.ts";

export const registry = new Registry();

if (process.env.NODE_ENV !== "test") {
  collectDefaultMetrics({ register: registry, prefix: "am_back_" });
}

export const httpRequestsTotal = new Counter({
  name: "am_back_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: "am_back_http_request_duration_seconds",
  help: "HTTP request duration",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const graphqlOperationsTotal = new Counter({
  name: "am_back_graphql_operations_total",
  help: "GraphQL operations",
  labelNames: ["operation", "type", "result"],
  registers: [registry],
});

export const graphqlOperationDuration = new Histogram({
  name: "am_back_graphql_operation_duration_seconds",
  help: "GraphQL operation duration",
  labelNames: ["operation", "type"],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const graphqlErrorsTotal = new Counter({
  name: "am_back_graphql_errors_total",
  help: "GraphQL errors by code",
  labelNames: ["code", "operation"],
  registers: [registry],
});

export const auditEventsTotal = new Counter({
  name: "am_back_audit_events_total",
  help: "Audit events written",
  labelNames: ["operation", "resource_type", "result"],
  registers: [registry],
});

export const auditWriteFailuresTotal = new Counter({
  name: "am_back_audit_write_failures_total",
  help: "Audit write failures",
  registers: [registry],
});

export const rateLimitExceededTotal = new Counter({
  name: "am_back_rate_limit_exceeded_total",
  help: "Rate limit exceeded",
  labelNames: ["scope"],
  registers: [registry],
});

export const dependencyUp = new Gauge({
  name: "am_back_dependency_up",
  help: "Dependency status (1=up, 0=down)",
  labelNames: ["dependency"],
  registers: [registry],
});

export const mongoReadyState = new Gauge({
  name: "am_back_mongo_ready_state",
  help: "Mongoose readyState",
  registers: [registry],
});

export const phiSearchResults = new Histogram({
  name: "am_back_phi_search_results",
  help: "Number of PHI rows returned by a list/search operation",
  labelNames: ["operation"],
  buckets: [0, 1, 5, 10, 25, 50, 100],
  registers: [registry],
});

export const phiSearchTruncatedTotal = new Counter({
  name: "am_back_phi_search_truncated_total",
  help: "PHI searches that hit the result cap",
  labelNames: ["operation"],
  registers: [registry],
});

export const operationQuotaExceededTotal = new Counter({
  name: "am_back_operation_quota_exceeded_total",
  help: "Per-operation quota exceeded",
  labelNames: ["operation"],
  registers: [registry],
});

const normalizeRoute = (req: Request): string => {
  if (req.path === "/graphql") return "/graphql";
  if (req.path.startsWith("/api/health")) return "/api/health";
  return "other";
};

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const startedAt = performance.now();
  let recorded = false;

  const record = () => {
    if (recorded) return;
    recorded = true;
    const labels = {
      method: req.method,
      route: normalizeRoute(req),
      status: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, (performance.now() - startedAt) / 1000);
  };

  res.on("finish", record);
  res.on("close", record);

  next();
}

let metricsServer: Server | undefined;

export async function startMetricsServer(): Promise<void> {
  if (process.env.NODE_ENV === "test") return;

  const port = Number(process.env.METRICS_PORT ?? 9464);
  const host = process.env.METRICS_HOST ?? "127.0.0.1";
  const token = process.env.METRICS_TOKEN;

  if (host !== "127.0.0.1" && !token) {
    logger.warn({ host, port }, "metrics_exposed_without_token");
  }
  metricsServer = createServer(async (req, res) => {
    try {
      if ((req.url ?? "").split("?")[0] !== "/metrics") {
        res.writeHead(404).end();
        return;
      }

      if (token) {
        const provided = Buffer.from(req.headers.authorization ?? "");
        const expected = Buffer.from(`Bearer ${token}`);
        const ok =
          provided.length === expected.length &&
          timingSafeEqual(provided, expected);
        if (!ok) {
          res.writeHead(401).end();
          return;
        }
      }

      res.setHeader("Content-Type", registry.contentType);
      res.end(await registry.metrics());
    } catch (err) {
      logger.error({ err: sanitizeError(err) }, "metrics_endpoint_failed");
      res.writeHead(500).end();
    }
  });

  // Handler persistente: once("error") solo captura el primer fallo.
  metricsServer.on("error", (err) => {
    logger.error({ err: sanitizeError(err) }, "metrics_server_error");
  });

  await new Promise<void>((resolve, reject) => {
    metricsServer!.once("error", reject);
    metricsServer!.listen(port, host, resolve);
  });

  logger.info({ port, host }, "metrics_server_started");
}

export async function stopMetricsServer(): Promise<void> {
  if (!metricsServer) return;

  await new Promise<void>((resolve) => {
    metricsServer!.closeAllConnections?.();
    metricsServer!.close(() => resolve());
  });

  metricsServer = undefined;
}
