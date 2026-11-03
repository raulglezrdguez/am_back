import { ApolloServer } from "@apollo/server";
import { GraphQLError } from "graphql";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
// import { ApolloServerPluginLandingPageProductionDefault } from "@apollo/server/plugin/landingPage/default";
import { ApolloServerPluginLandingPageDisabled } from "@apollo/server/plugin/disabled";
import depthLimit from "graphql-depth-limit";
import {
  getComplexity,
  simpleEstimator,
  fieldExtensionsEstimator,
} from "graphql-query-complexity";
import { typeDefs } from "../graphql/types/index.ts";
import { resolvers } from "../graphql/resolvers/index.ts";
import { type ApolloContext } from "./apollo.context.ts";
import { IS_PRODUCTION } from "./index.ts";

const MAX_DEPTH = 8; // recomendado 7-10
const MAX_COMPLEXITY = 1000; // puntos de costo por query

export function createApolloServer(httpServer: any) {
  return new ApolloServer<ApolloContext>({
    typeDefs,
    resolvers,
    // Desactiva introspección en producción
    introspection: !IS_PRODUCTION,

    // Capa 1: limitación de profundidad (se ejecuta en fase de validación, costo mínimo)
    validationRules: [depthLimit(MAX_DEPTH)],

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
      // Capa 2: análisis de complejidad (se ejecuta después de la validación, antes de la resolución)
      {
        async requestDidStart() {
          return {
            async didResolveOperation({ request, document, schema }) {
              const complexity = getComplexity({
                schema,
                operationName: request.operationName,
                query: document,
                variables: request.variables,
                estimators: [
                  // Prioridad 1: leer la configuración de complejidad en extensions del campo (si no existe, continuar)
                  fieldExtensionsEstimator(),
                  // Prioridad 2: complejidad predeterminada de campos sin configuración = 1
                  simpleEstimator({ defaultComplexity: 1 }),
                ],
              });

              if (complexity > MAX_COMPLEXITY) {
                throw new GraphQLError(
                  `Query too complex: ${complexity}. Maximum allowed: ${MAX_COMPLEXITY}`,
                  {
                    extensions: {
                      code: "COMPLEXITY_LIMIT_EXCEEDED",
                      complexity,
                      maxComplexity: MAX_COMPLEXITY,
                    },
                  },
                );
              }

              // Opcional: registrar queries con alta complejidad para observabilidad
              if (complexity > MAX_COMPLEXITY * 0.7) {
                console.warn(
                  `[graphql] high complexity query: ${complexity} (user: ${
                    request.http?.headers?.get("authorization")
                      ? "auth"
                      : "anon"
                  })`,
                );
              }
            },
          };
        },
      },
    ],
    formatError: (err) => {
      if (IS_PRODUCTION) {
        delete err.extensions?.stacktrace;
      }
      return err;
    },
  });
}
