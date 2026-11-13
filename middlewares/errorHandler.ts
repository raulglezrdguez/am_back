import { sanitizeError } from "./logger.ts";

export function errorHandler(err: any, req: any, res: any, next: any) {
  if (res.headersSent) return next(err);

  const statusCode = Number(err?.statusCode) || 500;
  const safeMessage = err?.isOperational
    ? String(err.message).slice(0, 300)
    : "Internal server error";

  req.log?.error(
    {
      err: sanitizeError(err),
      statusCode,
      requestId: req.id,
      userId: req.user?.id ?? null,
    },
    "request_failed",
  );

  return res.status(statusCode).send({
    error: safeMessage,
    requestId: req.id,
  });
}
