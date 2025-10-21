import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { typeDefs } from "../graphql/types/index.ts";
import { resolvers } from "../graphql/resolvers/index.ts";

export function createApolloServer(httpServer: any) {
  return new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [
      // Permite que Apollo se cierre cuando paremos el httpServer
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // En prod puedes cambiarlo por ApolloServerPluginLandingPageProductionDefault
      process.env.NODE_ENV === "production"
        ? ApolloServerPluginLandingPageLocalDefault({ embed: false })
        : ApolloServerPluginLandingPageLocalDefault({ embed: true }),
    ],
    // Opcional: formatea errores antes de enviarlos al cliente
    formatError: (err) => {
      // Quita el stack en producción
      if (process.env.NODE_ENV === "production") {
        delete err.extensions?.stacktrace;
      }
      return err;
    },
  });
}
