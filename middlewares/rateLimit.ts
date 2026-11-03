import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

await redisClient.connect();

export const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  limit: 100, // 100 peticiones / IP / ventana
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: "rl:global:",
  }),
  message: { error: "Too many requests, try again later." },
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === "/api/health";
  },
});

export const graphqlRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  limit: 200, // 200 peticiones / IP / ventana
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Usuario autenticado: limitar por userId
    const userId = (req as any).user?.id;
    if (userId) return userId;

    // Usuario no autenticado: usar IP, pero pasar por ipKeyGenerator para normalizar IPv6
    // Las direcciones IPv4 se devuelven sin cambios, las IPv6 se colapsan a subred /56 (por defecto)
    return req.ip ? ipKeyGenerator(req.ip) : "unknown";
  },
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: "rl:user:",
  }),
  message: { error: "Too many requests, try again later." },
});
