import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
// import { ApolloServerPluginLandingPageProductionDefault } from "@apollo/server/plugin/landingPage/default";
import { ApolloServerPluginLandingPageDisabled } from "@apollo/server/plugin/disabled";
import { typeDefs } from "../graphql/types/index.ts";
import { resolvers } from "../graphql/resolvers/index.ts";
import { type ApolloContext } from "./apollo.context.ts";
import { IS_PRODUCTION } from "./index.ts";

export function createApolloServer(httpServer: any) {
  return new ApolloServer<ApolloContext>({
    typeDefs,
    resolvers,
    // Desactiva introspección en producción
    introspection: !IS_PRODUCTION,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // landing page: deshabilitada en produccion
      IS_PRODUCTION
        ? ApolloServerPluginLandingPageDisabled()
        : ApolloServerPluginLandingPageLocalDefault({ embed: true }),
      // Landing page: producción usa ProductionDefault (sin Sandbox embebido)
      // IS_PRODUCTION
      //   ? ApolloServerPluginLandingPageProductionDefault({ embed: false })
      //   : ApolloServerPluginLandingPageLocalDefault({ embed: true }),
    ],
    formatError: (err) => {
      if (IS_PRODUCTION) {
        delete err.extensions?.stacktrace;
      }
      return err;
    },
  });
}
