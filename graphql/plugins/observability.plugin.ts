import type { ApolloServerPlugin } from "@apollo/server";
import { GraphQLError, type FieldNode } from "graphql";
import * as Sentry from "@sentry/node";
import type { ApolloContext } from "../../config/apollo.context.ts";
import { logger, sanitizeError } from "../../middlewares/logger.ts";
import {
  graphqlErrorsTotal,
  graphqlOperationDuration,
  graphqlOperationsTotal,
} from "../../config/metrics.ts";
import { isExpectedCode } from "../../errors/errorCatalog.ts";
import { randomUUID } from "node:crypto";
import { classifyError } from "../../errors/graphqlErrors.ts";

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
          const classified = classifyError(err.originalError ?? err);
          const code = classified.code;
          const errorId = randomUUID();

          (err as any).extensions = {
            ...(err.extensions ?? {}),
            requestId: contextValue.requestId,
            errorId,
          };

          graphqlErrorsTotal.inc({ code, operation: metricOperation });

          const payload = {
            requestId: contextValue.requestId,
            errorId,
            code,
            operation: metricOperation,
            path: err.path,
            errorName: (err.originalError as any)?.name ?? err.name,
            err: sanitizeError(err.originalError ?? err),
          };

          if (
            code === "INTERNAL_SERVER_ERROR" ||
            code === "SERVICE_UNAVAILABLE"
          ) {
            (contextValue.logger ?? logger).error(payload, "graphql_error");
          } else if (code === "UNAUTHENTICATED" || code === "FORBIDDEN") {
            (contextValue.logger ?? logger).debug(payload, "graphql_error");
          } else {
            (contextValue.logger ?? logger).warn(payload, "graphql_error");
          }

          if (!isExpectedCode(code) && Sentry.getClient()) {
            const safeError = new Error(code);
            safeError.name =
              (err.originalError as any)?.name ?? err.name ?? "GraphQLError";

            Sentry.captureException(safeError, {
              tags: {
                requestId: contextValue.requestId,
                errorId,
                code,
                operation: metricOperation,
              },
              fingerprint: [code, metricOperation],
            });
          }
        }
      },

      async willSendResponse({ errors }) {
        const durationMs = performance.now() - startedAt;
        const result = errors?.length ? "error" : "success";
        const errorCodes =
          errors?.map((err) => classifyError(err.originalError ?? err).code) ??
          [];

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
