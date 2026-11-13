import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import express from "express";
import http from "http";
import cors from "cors";
import * as Sentry from "@sentry/node";

import { createApolloServer } from "./config/apollo.ts";
import { authMiddleware } from "./middlewares/auth.ts";
import { loggerMiddleware, requestIdMiddleware } from "./middlewares/logger.ts";
import { errorHandler } from "./middlewares/errorHandler.ts";
import { metricsMiddleware } from "./config/metrics.ts";
import apiRoutes from "./api/routes/index.ts";
import { type ApolloContext } from "./config/apollo.context.ts";
import { TRUST_PROXY } from "./config/index.ts";
import { createRateLimitMiddlewares } from "./middlewares/rateLimit.ts";

export const createServer = async () => {
  const app = express();
  app.set("trust proxy", TRUST_PROXY);

  const httpServer = http.createServer(app);
  // Detrás de un ALB/Ingress, mantener keep-alive algo mayor que el del proxy.
  httpServer.keepAliveTimeout = 65_000;
  httpServer.headersTimeout = 66_000;

  const apolloServer: ApolloServer<ApolloContext> =
    createApolloServer(httpServer);
  await apolloServer.start();

  const { rateLimitMiddleware, graphqlRateLimit } =
    createRateLimitMiddlewares();

  // 1. Contexto y logging antes de rate limit/auth para correlacionar 429/401.
  app.use(requestIdMiddleware);
  app.use(loggerMiddleware);
  app.use(metricsMiddleware);
  app.use(rateLimitMiddleware);
  app.use(express.json({ limit: "100kb" }));

  app.use(
    "/graphql",
    cors<cors.CorsRequest>(),
    authMiddleware,
    graphqlRateLimit,
    expressMiddleware(apolloServer, {
      context: async ({ req }) => ({
        currentUser: req.user,
        requestId: req.id,
        ip: req.ip ?? null,
        userAgent: req.headers["user-agent"]?.slice(0, 256) ?? null,
        logger: req.log,
      }),
    }),
  );

  app.use(apiRoutes);
  app.use((req, res) =>
    res.status(404).send({ error: "Route not found", requestId: req.id }),
  );

  // Sentry debe ir antes del handler propio; si no está inicializado, es no-op.
  if (Sentry.getClient()) {
    Sentry.setupExpressErrorHandler(app);
  }
  app.use(errorHandler);

  return { app, httpServer, apolloServer };
};
