import { logger } from "./logger.ts";

export function errorHandler(err: any, _req: any, res: any, _next: any) {
  logger.error(err);

  // Errores conocidos (lanzados por nosotros)
  if (err.isOperational) {
    return res.status(err.statusCode).send({ error: err.message });
  }

  // Cualquier otro error
  return res.status(500).send({ error: "Internal server error" });
}
