import { randomUUID } from "node:crypto";
import { sanitizeError } from "./logger.ts";
import { classifyHttpError } from "../errors/httpErrors.ts";

export function errorHandler(err: any, req: any, res: any, next: any) {
  if (res.headersSent) return next(err);

  const info = classifyHttpError(err);
  const errorId = randomUUID();

  const payload = {
    err: sanitizeError(err),
    statusCode: info.statusCode,
    code: info.code,
    requestId: req.id,
    errorId,
    userId: req.user?.id ?? null,
  };

  if (info.statusCode >= 500) {
    req.log?.error(payload, "request_failed");
  } else {
    req.log?.warn(payload, "request_failed");
  }

  return res.status(info.statusCode).send({
    error: info.message,
    code: info.code,
    requestId: req.id,
    errorId,
  });
}
