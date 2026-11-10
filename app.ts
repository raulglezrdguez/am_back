import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import express from "express";
import http from "http";
import cors from "cors";

import { createApolloServer } from "./config/apollo.ts";
import { authMiddleware } from "./middlewares/auth.ts";
import { loggerMiddleware } from "./middlewares/logger.ts";
import {
  graphqlRateLimit,
  rateLimitMiddleware,
} from "./middlewares/rateLimit.ts";
import { errorHandler } from "./middlewares/errorHandler.ts";
import apiRoutes from "./api/routes/index.ts";
import { type ApolloContext } from "./config/apollo.context.ts";

export const createServer = async () => {
  const app = express();
  app.set("trust proxy", 1);
  const httpServer = http.createServer(app);

  const apolloServer: ApolloServer<ApolloContext> =
    createApolloServer(httpServer);
  await apolloServer.start();

  app.use(rateLimitMiddleware);
  app.use(loggerMiddleware);
  app.use(express.json());
  app.use(
    "/graphql",
    cors<cors.CorsRequest>(),
    authMiddleware,
    graphqlRateLimit,
    expressMiddleware(apolloServer, {
      context: async ({ req }) => ({ currentUser: req.user }),
    }),
  );

  app.use(apiRoutes);
  app.use((req, res) => res.status(404).send({ error: "Route not found" }));
  app.use(errorHandler);

  return { app, httpServer, apolloServer };
};
