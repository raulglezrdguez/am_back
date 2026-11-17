export const ERROR_CATALOG = {
  UNAUTHENTICATED: {
    httpStatus: 401,
    message: "Authentication required",
    expected: true,
  },
  FORBIDDEN: { httpStatus: 403, message: "Not allowed", expected: true },
  NOT_FOUND: { httpStatus: 404, message: "Resource not found", expected: true },
  BAD_USER_INPUT: { httpStatus: 400, message: "Invalid input", expected: true },
  CONFLICT: { httpStatus: 409, message: "Conflict", expected: true },
  RATE_LIMITED: {
    httpStatus: 429,
    message: "Too many requests",
    expected: true,
  },
  TOO_MANY_REQUESTS: {
    httpStatus: 429,
    message: "Too many requests",
    expected: true,
  },
  GRAPHQL_PARSE_FAILED: {
    httpStatus: 400,
    message: "Invalid query",
    expected: true,
  },
  GRAPHQL_VALIDATION_FAILED: {
    httpStatus: 400,
    message: "Invalid query",
    expected: true,
  },
  COMPLEXITY_LIMIT_EXCEEDED: {
    httpStatus: 400,
    message: "Query too complex",
    expected: true,
  },
  BAD_REQUEST: { httpStatus: 400, message: "Bad request", expected: true },
  PAYLOAD_TOO_LARGE: {
    httpStatus: 413,
    message: "Payload too large",
    expected: true,
  },
  UNSUPPORTED_MEDIA_TYPE: {
    httpStatus: 415,
    message: "Unsupported media type",
    expected: true,
  },
  SERVICE_UNAVAILABLE: {
    httpStatus: 503,
    message: "Service temporarily unavailable",
    expected: true,
  },
  INTERNAL_SERVER_ERROR: {
    httpStatus: 500,
    message: "Internal server error",
    expected: false,
  },
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export const isErrorCode = (value: unknown): value is ErrorCode =>
  typeof value === "string" &&
  Object.prototype.hasOwnProperty.call(ERROR_CATALOG, value);

export const isExpectedCode = (value: unknown): value is ErrorCode =>
  isErrorCode(value) && ERROR_CATALOG[value].expected;
