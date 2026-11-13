import { performance } from "node:perf_hooks";
import { GraphQLError, type GraphQLResolveInfo } from "graphql";
import type { ApolloContext } from "../config/apollo.context.ts";
import { AUDIT_FAIL_CLOSED } from "../config/index.ts";
import {
  AuditUnavailableError,
  writeAuditEvent,
  type AuditMetadata,
} from "../services/audit.service.ts";
import { phiSearchResults } from "../config/metrics.ts";
import { assertOperationQuota } from "./operationLimit.ts";

type Resolver = (
  parent: any,
  args: any,
  ctx: ApolloContext,
  info: GraphQLResolveInfo,
) => Promise<any> | any;

export type AuditConfig = {
  resourceType: string;
  resourceId?: (args: any, result: any) => string | null | undefined;
  metadata?: (args: any, result: any) => AuditMetadata | undefined;
};

export const asAuditId = (value: unknown): string | null =>
  typeof value === "string" && /^[a-f0-9]{24}$/i.test(value) ? value : null;

const firstId = (...values: unknown[]): string | null => {
  for (const value of values) {
    const id = asAuditId(value);
    if (id) return id;
  }
  return null;
};

const errorCode = (err: unknown): string => {
  if (err instanceof GraphQLError) {
    return String(err.extensions?.code ?? "GRAPHQL_ERROR");
  }
  const name = (err as any)?.name;
  if (name === "NotFoundError") return "NOT_FOUND";
  if (name === "AuditUnavailableError") return "SERVICE_UNAVAILABLE";
  if (typeof name === "string" && /^[A-Z0-9_]+$/.test(name)) return name;
  return "INTERNAL_ERROR";
};

const resultStatus = (ctx: ApolloContext, result: any) => {
  if (!ctx.currentUser) return "denied" as const;
  if (result === null || result === undefined) return "not_found" as const;
  return "success" as const;
};

const errorStatus = (ctx: ApolloContext, err: unknown) => {
  if (!ctx.currentUser) return "denied" as const;
  const code = errorCode(err);
  if (code === "NOT_FOUND") return "not_found" as const;
  if (code === "RATE_LIMITED") return "denied" as const;
  return "error" as const;
};

const auditContext = (ctx: ApolloContext) => ({
  requestId: ctx.requestId,
  userId: ctx.currentUser?.id ?? null,
  userRole: ctx.currentUser?.role ?? null,
  ip: ctx.ip,
  userAgent: ctx.userAgent,
});

const serviceUnavailable = () =>
  new GraphQLError("Service temporarily unavailable", {
    extensions: { code: "SERVICE_UNAVAILABLE" },
  });

export const withAudit =
  (config: AuditConfig, resolver: Resolver): Resolver =>
  async (parent, args, ctx, info) => {
    const startedAt = performance.now();
    const operationType =
      info.parentType.name === "Mutation"
        ? ("mutation" as const)
        : ("query" as const);
    const base = {
      operation: info.fieldName,
      operationType,
      resourceType: config.resourceType,
    };
    const context = auditContext(ctx);

    try {
      // Cuota por usuario y operación sensible (si aplica).
      if (ctx.currentUser?.id) {
        await assertOperationQuota(ctx.currentUser.id, info.fieldName);
      }

      if (operationType === "mutation") {
        await writeAuditEvent(
          {
            ...base,
            resourceId:
              config.resourceId?.(args, undefined) ?? firstId(args?.id),
            result: "attempt",
            reason: "MUTATION_ATTEMPT",
            metadata: config.metadata?.(args, undefined),
          },
          context,
          { failClosed: true },
        );
      }

      const result = await resolver(parent, args, ctx, info);

      if (operationType === "query" && Array.isArray(result)) {
        phiSearchResults.observe({ operation: info.fieldName }, result.length);
      }

      await writeAuditEvent(
        {
          ...base,
          resourceId: config.resourceId?.(args, result) ?? firstId(args?.id),
          result: resultStatus(ctx, result),
          reason: !ctx.currentUser ? "UNAUTHENTICATED" : undefined,
          durationMs: Math.round(performance.now() - startedAt),
          metadata: config.metadata?.(args, result),
        },
        context,
        // Las lecturas PHI son fail-closed por defecto, pero el flag permite
        // una reversión temporal documentada.
        { failClosed: operationType === "query" ? AUDIT_FAIL_CLOSED : false },
      );

      return result;
    } catch (err) {
      if (err instanceof AuditUnavailableError) {
        throw serviceUnavailable();
      }

      // No ocultar el error original; solo auditar el resultado.
      await writeAuditEvent(
        {
          ...base,
          resourceId: config.resourceId?.(args, undefined) ?? firstId(args?.id),
          result: errorStatus(ctx, err),
          reason: errorCode(err),
          durationMs: Math.round(performance.now() - startedAt),
          metadata: config.metadata?.(args, undefined),
        },
        context,
        { failClosed: false },
      ).catch(() => undefined);

      throw err;
    }
  };

export const auditResolvers = (
  resolvers: Record<string, any>,
  configs: Record<string, AuditConfig>,
): Record<string, any> => {
  const wrapped: Record<string, any> = {};

  for (const [field, resolver] of Object.entries(resolvers)) {
    const config = configs[field];
    if (!config) {
      wrapped[field] = resolver;
      continue;
    }

    if (typeof resolver === "function") {
      wrapped[field] = withAudit(config, resolver);
    } else if (resolver && typeof resolver.resolve === "function") {
      wrapped[field] = {
        ...resolver,
        resolve: withAudit(config, resolver.resolve),
      };
    } else {
      wrapped[field] = resolver;
    }
  }

  return wrapped;
};
