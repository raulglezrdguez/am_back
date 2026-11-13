import type { ApolloServerPlugin } from "@apollo/server";
import { GraphQLError, type FieldNode } from "graphql";
import * as Sentry from "@sentry/node";
import type { ApolloContext } from "../../config/apollo.context.ts";
import { logger } from "../../middlewares/logger.ts";
import {
  graphqlErrorsTotal,
  graphqlOperationDuration,
  graphqlOperationsTotal,
} from "../../config/metrics.ts";

const EXPECTED_CODES = new Set([
  "UNAUTHENTICATED",
  "NOT_FOUND",
  "BAD_USER_INPUT",
  "GRAPHQL_VALIDATION_FAILED",
  "COMPLEXITY_LIMIT_EXCEEDED",
  "RATE_LIMITED",
  "SERVICE_UNAVAILABLE",
]);

const firstFieldName = (operation: any): string => {
  const selection = operation?.selectionSet?.selections?.find(
    (item: any) => item.kind === "Field",
  ) as FieldNode | undefined;

  return selection?.name?.value ?? "anonymous";
};

export const observabilityPlugin: ApolloServerPlugin<ApolloContext> = {
  async requestDidStart({ contextValue, request }) {
    const startedAt = performance.now();
    let operationName = request.operationName ?? "anonymous";
    let operationType = "query";
    let metricOperation = "anonymous";

    return {
      async didResolveOperation({ operation, operationName: resolvedName }) {
        operationName = resolvedName ?? operation?.name?.value ?? operationName;
        operationType = operation?.operation ?? "query";
        // Campo de primer nivel: acotado por el schema, no por el cliente.
        metricOperation = firstFieldName(operation);

        contextValue.operationName = operationName.slice(0, 128);
        contextValue.operationType = operationType as
          | "query"
          | "mutation"
          | "subscription";
      },

      async didEncounterErrors({ errors }) {
        for (const err of errors) {
          const code = String(err.extensions?.code ?? "INTERNAL_SERVER_ERROR");

          (err as any).extensions = {
            ...(err.extensions ?? {}),
            requestId: contextValue.requestId,
          };

          graphqlErrorsTotal.inc({
            code,
            operation: metricOperation,
          });

          if (!EXPECTED_CODES.has(code) && Sentry.getClient()) {
            // No enviar el mensaje original: puede contener PHI.
            const safeError = new Error(code);
            safeError.name = err.name ?? "GraphQLError";
            safeError.stack = err.stack;

            Sentry.captureException(safeError, {
              tags: {
                requestId: contextValue.requestId,
                operation: metricOperation,
                code,
              },
              user: contextValue.currentUser
                ? { id: contextValue.currentUser.id }
                : undefined,
            });
          }
        }
      },

      async willSendResponse({ errors }) {
        const durationMs = performance.now() - startedAt;
        const result = errors?.length ? "error" : "success";
        const errorCodes =
          errors?.map((err) =>
            String(err.extensions?.code ?? "INTERNAL_SERVER_ERROR"),
          ) ?? [];

        (contextValue.logger ?? logger).info(
          {
            requestId: contextValue.requestId,
            userId: contextValue.currentUser?.id ?? null,
            operation: operationName.slice(0, 128),
            operationType,
            result,
            durationMs: Math.round(durationMs),
            errorCodes,
          },
          "graphql_operation",
        );

        graphqlOperationsTotal.inc({
          operation: metricOperation,
          type: operationType,
          result,
        });

        graphqlOperationDuration.observe(
          { operation: metricOperation, type: operationType },
          durationMs / 1000,
        );
      },
    };
  },
};
