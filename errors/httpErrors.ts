import { AppError } from "./appError.ts";
import { ERROR_CATALOG, type ErrorCode } from "./errorCatalog.ts";

export type HttpErrorShape = {
  statusCode: number;
  code: ErrorCode;
  message: string;
};

const BODY_PARSER_ERRORS: Record<string, HttpErrorShape> = {
  "entity.parse.failed": {
    statusCode: 400,
    code: "BAD_REQUEST",
    message: "Malformed JSON body",
  },
  "entity.too.large": {
    statusCode: 413,
    code: "PAYLOAD_TOO_LARGE",
    message: "Payload too large",
  },
  "encoding.unsupported": {
    statusCode: 415,
    code: "UNSUPPORTED_MEDIA_TYPE",
    message: "Unsupported media type",
  },
};

const codeFromStatus = (statusCode: number): ErrorCode => {
  if (statusCode === 400) return "BAD_REQUEST";
  if (statusCode === 401) return "UNAUTHENTICATED";
  if (statusCode === 403) return "FORBIDDEN";
  if (statusCode === 404) return "NOT_FOUND";
  if (statusCode === 409) return "CONFLICT";
  if (statusCode === 413) return "PAYLOAD_TOO_LARGE";
  if (statusCode === 415) return "UNSUPPORTED_MEDIA_TYPE";
  if (statusCode === 429) return "TOO_MANY_REQUESTS";
  if (statusCode === 503) return "SERVICE_UNAVAILABLE";
  return statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST";
};

export function classifyHttpError(error: unknown): HttpErrorShape {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
    };
  }

  const err = error as {
    type?: unknown;
    expose?: unknown;
    isOperational?: unknown;
    statusCode?: unknown;
    status?: unknown;
    message?: unknown;
  };

  if (typeof err.type === "string" && BODY_PARSER_ERRORS[err.type]) {
    return BODY_PARSER_ERRORS[err.type];
  }

  const status = Number(err.statusCode ?? err.status);
  const operational = err.isOperational === true || err.expose === true;

  if (
    operational &&
    Number.isInteger(status) &&
    status >= 400 &&
    status <= 599
  ) {
    return {
      statusCode: status,
      code: codeFromStatus(status),
      message:
        typeof err.message === "string"
          ? err.message.slice(0, 300)
          : ERROR_CATALOG.INTERNAL_SERVER_ERROR.message,
    };
  }

  return {
    statusCode: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: ERROR_CATALOG.INTERNAL_SERVER_ERROR.message,
  };
}
