import pino from "pino";
export const logger = pino({ level: process.env.LOG_LEVEL || "info" });

export function loggerMiddleware(req: any, _res: any, next: any) {
  req.log = logger; // disponible en controllers/resolvers
  req.log.info({ method: req.method, url: req.url, ip: req.ip });
  next();
}
