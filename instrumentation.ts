import "./config/env.ts"; // PRIMERO: carga .env antes de leer process.env
import * as Sentry from "@sentry/node";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

const serviceName = process.env.OTEL_SERVICE_NAME ?? "am-back";
const version = process.env.APP_VERSION ?? "dev";
const sentryDsn = process.env.SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV ?? "development",
    release: version,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // Sentry v11: sustituye a sendDefaultPii (eliminado en v11).
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      databaseQueryData: false,
      stackFrameVariables: false,
    },
    beforeSend(event) {
      scrubSentryEvent(event);
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data) {
        delete breadcrumb.data.url;
        delete breadcrumb.data.query;
        delete breadcrumb.data.body;
        delete breadcrumb.data.response;
      }
      return breadcrumb;
    },
  });
}

function scrubSentryEvent(event: Sentry.Event): void {
  if (event.request) {
    delete event.request.data;
    delete event.request.headers;
    delete event.request.cookies;
    delete event.request.query_string;
    // La URL puede llevar query params con PHI.
    delete (event.request as any).url;
  }

  delete event.extra;
  delete event.message;

  // El mensaje original de la excepción puede contener PHI.
  if (event.exception?.values) {
    for (const value of event.exception.values) {
      value.value = value.type ?? "Error";
    }
  }

  // Conservar solo la traza; contextos de request pueden llevar datos.
  if (event.contexts) {
    const trace = event.contexts.trace;
    event.contexts = trace ? { trace } : {};
  }

  if (event.user) {
    delete event.user.email;
    delete event.user.username;
    delete event.user.ip_address;
  }
}

let sdk: NodeSDK | undefined;
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (process.env.OTEL_ENABLED !== "false" && otlpEndpoint) {
  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: version,
    }),
    traceExporter: new OTLPTraceExporter({ url: otlpEndpoint }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-graphql": { allowValues: false },
        "@opentelemetry/instrumentation-http": {
          ignoreIncomingRequestHook: (req) =>
            (req.url ?? "").startsWith("/api/health") ||
            (req.url ?? "").startsWith("/metrics"),
        },
      }),
    ],
  });

  sdk.start();
}

export async function shutdownTelemetry(): Promise<void> {
  await Promise.allSettled([sdk?.shutdown(), Sentry.close(2_000)]);
}
