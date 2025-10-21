import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import express from "express";
import http from "http";
import cors from "cors";

import { connectDB } from "./config/db.ts";
import { PORT } from "./config/index.ts";
import { createApolloServer } from "./config/apollo.ts";
import { authMiddleware } from "./middlewares/auth.ts";

await connectDB();

const app = express();
const httpServer = http.createServer(app);

const apolloServer: ApolloServer = createApolloServer(httpServer);
await apolloServer.start();

app.use(express.json());
app.use(
  "/graphql",
  cors<cors.CorsRequest>(),
  authMiddleware,
  expressMiddleware(apolloServer, {
    context: async ({ req }) => ({ currentUser: req.user }),
  })
);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
});
