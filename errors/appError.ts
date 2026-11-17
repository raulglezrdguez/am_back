import { ERROR_CATALOG, type ErrorCode } from "./errorCatalog.ts";

export class AppError extends Error {
  readonly isOperational = true;
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AppError";
    this.code = code;
    this.statusCode = ERROR_CATALOG[code].httpStatus;
    this.details = details;
  }
}

export const unauthenticated = (
  message = ERROR_CATALOG.UNAUTHENTICATED.message,
) => new AppError("UNAUTHENTICATED", message);

export const forbidden = (message = ERROR_CATALOG.FORBIDDEN.message) =>
  new AppError("FORBIDDEN", message);

export const notFound = (message = ERROR_CATALOG.NOT_FOUND.message) =>
  new AppError("NOT_FOUND", message);

export const badInput = (
  message = ERROR_CATALOG.BAD_USER_INPUT.message,
  details?: Record<string, unknown>,
) => new AppError("BAD_USER_INPUT", message, details);

export const conflict = (message = ERROR_CATALOG.CONFLICT.message) =>
  new AppError("CONFLICT", message);

export const serviceUnavailable = (
  message = ERROR_CATALOG.SERVICE_UNAVAILABLE.message,
) => new AppError("SERVICE_UNAVAILABLE", message);

export const internalError = (
  message = ERROR_CATALOG.INTERNAL_SERVER_ERROR.message,
) => new AppError("INTERNAL_SERVER_ERROR", message);
