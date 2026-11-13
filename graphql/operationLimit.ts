import { GraphQLError } from "graphql";
import { redisClient } from "../middlewares/rateLimit.ts";
import { NODE_ENV } from "../config/index.ts";
import { operationQuotaExceededTotal } from "../config/metrics.ts";
import { logger, sanitizeError } from "../middlewares/logger.ts";

type Bucket = { count: number; resetAt: number };

const WINDOW_SECONDS = 60;
const MAX_BUCKETS = 10_000;

const LIMITS: Record<string, number> = {
  patientBy: 20,
  sharedPatientBy: 20,
  allPatientBy: 20,
  getStats: 30,
  getStatsByPatient: 30,
  getStatsByExam: 30,
};

const buckets = new Map<string, Bucket>();

const deny = (operation: string): never => {
  operationQuotaExceededTotal.inc({ operation });
  throw new GraphQLError("Operation quota exceeded", {
    extensions: { code: "RATE_LIMITED" },
  });
};

const prune = () => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
};

export async function assertOperationQuota(
  userId: string,
  operation: string,
): Promise<void> {
  const limit = LIMITS[operation];
  if (!limit || NODE_ENV === "test") return;

  const key = `opq:${operation}:${userId}`;

  if (redisClient?.isReady) {
    try {
      const count = await redisClient.incr(key);
      if (count === 1) await redisClient.expire(key, WINDOW_SECONDS);
      if (count > limit) deny(operation);
      return;
    } catch (err) {
      // Redis caído: no bloquear el servicio; se usa memoria y se alerta.
      logger.warn(
        { err: sanitizeError(err), operation },
        "operation_quota_redis_failed",
      );
    }
  }

  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) prune();

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
    return;
  }

  bucket.count += 1;
  if (bucket.count > limit) deny(operation);
}

export function resetOperationQuotas(): void {
  buckets.clear();
}
