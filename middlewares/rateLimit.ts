import rateLimit from "express-rate-limit";

export const rateLimitMiddleware = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  limit: 100, // 100 peticiones / IP / ventana
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
  message: { error: "Too many requests, try again later." },
});
