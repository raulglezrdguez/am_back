import { randomUUID } from "node:crypto";
import { GraphQLError, type GraphQLFormattedError } from "graphql";
import { AppError } from "./appError.ts";
import { ERROR_CATALOG, isErrorCode, type ErrorCode } from "./errorCatalog.ts";

type ErrorLike = {
  name?: string;
  code?: string | number;
  keyPattern?: Record<string, unknown>;
  errors?: Record<string, unknown>;
  writeErrors?: Array<{
    code?: unknown;
    err?: { keyPattern?: Record<string, unknown> };
  }>;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const safeFieldNames = (value: unknown): string[] | undefined => {
  const fields = Object.keys(asRecord(value))
    .filter((key) => /^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(key))
    .slice(0, 25);
  return fields.length > 0 ? fields : undefined;
};

const duplicateFields = (err: ErrorLike) =>
  safeFieldNames(err.keyPattern ?? err.writeErrors?.[0]?.err?.keyPattern);

const isDuplicateKey = (err: ErrorLike) => {
  if (err.code === 11000 || err.code === 11001) return true;
  return (
    err.name === "MongoBulkWriteError" &&
    (err.writeErrors ?? []).some(
      (item) => item.code === 11000 || item.code === 11001,
    )
  );
};

const SAFE_EXTENSION_KEYS = new Set([
  "fields",
  "retryAfter",
  "complexity",
  "maxComplexity",
]);

const safeExtensions = (extensions?: Record<string, unknown>) => {
  if (!extensions) return undefined;
  const safe: Record<string, unknown> = {};
  for (const key of SAFE_EXTENSION_KEYS) {
    if (extensions[key] !== undefined) safe[key] = extensions[key];
  }
  return Object.keys(safe).length > 0 ? safe : undefined;
};

export type ClassifiedError = {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export function classifyError(error: unknown): ClassifiedError {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message, details: error.details };
  }

  if (error instanceof GraphQLError) {
    if (error.originalError) {
      const fromOriginal = classifyError(error.originalError);
      if (fromOriginal.code !== "INTERNAL_SERVER_ERROR") return fromOriginal;
    }

    const code = isErrorCode(error.extensions?.code)
      ? error.extensions.code
      : "INTERNAL_SERVER_ERROR";

    return {
      code,
      message:
        code === "INTERNAL_SERVER_ERROR"
          ? ERROR_CATALOG.INTERNAL_SERVER_ERROR.message
          : error.message,
      details: safeExtensions(error.extensions as Record<string, unknown>),
    };
  }

  // Errores ya formateados (objetos planos con `extensions.code`), p. ej. los
  // que llegan de un plugin o de un formateador previo. Sin este caso,
  // `classifyError(formattedError)` perdería un código válido y lo convertiría
  // en INTERNAL_SERVER_ERROR.
  if (error && typeof error === "object") {
    const extensions = asRecord((error as { extensions?: unknown }).extensions);
    if (isErrorCode(extensions.code)) {
      const code = extensions.code;
      const rawMessage = (error as { message?: unknown }).message;
      return {
        code,
        message:
          code === "INTERNAL_SERVER_ERROR"
            ? ERROR_CATALOG.INTERNAL_SERVER_ERROR.message
            : typeof rawMessage === "string" && rawMessage.length > 0
              ? rawMessage
              : ERROR_CATALOG[code].message,
        details: safeExtensions(extensions),
      };
    }
  }

  const err = error as ErrorLike;

  if (isDuplicateKey(err)) {
    return {
      code: "CONFLICT",
      message: "Resource already exists",
      details: { fields: duplicateFields(err) },
    };
  }

  switch (err.name) {
    case "CastError":
    case "BSONError":
    case "BSONTypeError":
      return { code: "BAD_USER_INPUT", message: "Invalid input" };

    case "ValidationError": {
      const fields = safeFieldNames(err.errors);
      return {
        code: "BAD_USER_INPUT",
        message: "Invalid input",
        details: fields ? { fields } : undefined,
      };
    }

    case "MongoNetworkError":
    case "MongoServerSelectionError":
    case "MongoTimeoutError":
      return {
        code: "SERVICE_UNAVAILABLE",
        message: ERROR_CATALOG.SERVICE_UNAVAILABLE.message,
      };

    default:
      return {
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CATALOG.INTERNAL_SERVER_ERROR.message,
      };
  }
}

export type GraphQLErrorFormatOptions = {
  isProduction: boolean;
  requestId?: string;
  errorId?: string;
};

const DETAILED_IN_NON_PROD = new Set<ErrorCode>([
  "BAD_USER_INPUT",
  "GRAPHQL_PARSE_FAILED",
  "GRAPHQL_VALIDATION_FAILED",
]);

export function formatGraphQLError(
  formattedError: GraphQLFormattedError,
  originalError: unknown,
  options: GraphQLErrorFormatOptions,
): GraphQLFormattedError {
  const classified = classifyError(originalError ?? formattedError);
  const code = classified.code;

  const errorId =
    options.errorId ??
    (typeof formattedError.extensions?.errorId === "string"
      ? formattedError.extensions.errorId
      : undefined) ??
    randomUUID();

  const requestId =
    options.requestId ??
    (typeof formattedError.extensions?.requestId === "string"
      ? formattedError.extensions.requestId
      : undefined);

  let message = classified.message;

  // En test/desarrollo se conservan detalles seguros de validación para no
  // romper la DX ni los tests existentes. Nunca se usa el mensaje de Mongoose.
  if (!options.isProduction && DETAILED_IN_NON_PROD.has(code)) {
    message = formattedError.message || message;
  } else if (options.isProduction) {
    message = ERROR_CATALOG[code].message;
  }

  return {
    message,
    ...(formattedError.locations
      ? { locations: formattedError.locations }
      : {}),
    ...(formattedError.path ? { path: formattedError.path } : {}),
    extensions: {
      code,
      ...(requestId ? { requestId } : {}),
      errorId,
      ...(classified.details ?? {}),
    },
  };
}
