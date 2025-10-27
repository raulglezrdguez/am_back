import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import express from "express";
import http from "http";
import cors from "cors";

import { connectDB } from "./config/db.ts";
import { PORT } from "./config/index.ts";
import { createApolloServer } from "./config/apollo.ts";
import { authMiddleware } from "./middlewares/auth.ts";

import apiRoutes from "./api/routes/index.ts";

import { loggerMiddleware } from "./middlewares/logger.ts";
import { rateLimitMiddleware } from "./middlewares/rateLimit.ts";
import { errorHandler } from "./middlewares/errorHandler.ts";
import { type ApolloContext } from "./config/apollo.context.ts";

await connectDB();

export const app = express();
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
  expressMiddleware(apolloServer, {
    context: async ({ req }) => ({ currentUser: req.user }),
  })
);

app.use(apiRoutes);
app.use((req, res) => res.status(404).send({ error: "Route not found" }));

// siempre al final
app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
});
