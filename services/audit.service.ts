import { randomUUID } from "node:crypto";
import {
  type AuditOperationType,
  type AuditResult,
} from "../models/auditLog.model.ts";
import { getAuditModel } from "../config/auditDb.ts";
import { logger, sanitizeError } from "../middlewares/logger.ts";
import {
  auditEventsTotal,
  auditWriteFailuresTotal,
} from "../config/metrics.ts";
import {
  AUDIT_ENABLED,
  AUDIT_FAIL_CLOSED,
  AUDIT_WRITE_CONCERN,
} from "../config/index.ts";

export type AuditContext = {
  requestId: string;
  userId?: string | null;
  userRole?: number | null;
  ip?: string | null;
  userAgent?: string | null;
};

export type AuditMetadata = Record<
  string,
  string | number | boolean | null | undefined
>;

export type AuditEventInput = {
  operation: string;
  operationType: AuditOperationType;
  resourceType: string;
  resourceId?: string | null;
  result: AuditResult;
  reason?: string | null;
  durationMs?: number | null;
  metadata?: AuditMetadata;
};

/**
 * Lista blanca de metadatos. Cualquier clave fuera de esta lista se rechaza.
 * Nunca añadir aquí nombres, identificadores de paciente, resultados, respuestas,
 * direcciones, teléfonos, emails ni historia clínica.
 */
const METADATA_ALLOWLIST = new Set([
  "resultCount",
  "statCount",
  "hasName",
  "hasIdentifier",
  "truncated",
  "targetUserId",
  "patientId",
  "examId",
  "fieldCount",
  "filterExam",
  "filterResult",
  "filterAddress",
  "filterCompletedAt",
  "method",
  "tokenType",
  "emailVerified",
  "role",
  "status",
  "provisioned",
]);

export class AuditUnavailableError extends Error {
  readonly statusCode = 503;
  readonly isOperational = true;

  constructor() {
    super("Audit log unavailable");
    this.name = "AuditUnavailableError";
  }
}

const truncate = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max)}…` : value;

const AUDIT_ID_RE = /^[a-f0-9]{24}$/i;

const sanitizeMetadata = (metadata: AuditMetadata = {}) => {
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (!METADATA_ALLOWLIST.has(key)) {
      // Nunca lanzar aquí: una clave de metadata no debe tumbar una mutación.
      logger.warn({ key }, "audit_metadata_key_rejected");
      continue;
    }

    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      if (typeof value === "number" && !Number.isFinite(value)) continue;
      clean[key] = typeof value === "string" ? truncate(value, 128) : value;
    }
  }

  return clean;
};

const safeResourceId = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (AUDIT_ID_RE.test(value)) return value;
  logger.warn({ resourceIdLength: value.length }, "audit_resource_id_rejected");
  return null;
};

let auditDisabledWarned = false;
export async function writeAuditEvent(
  event: AuditEventInput,
  ctx: AuditContext,
  options: { failClosed?: boolean } = {},
): Promise<void> {
  if (!AUDIT_ENABLED) {
    if (!auditDisabledWarned) {
      auditDisabledWarned = true;
      logger.warn("audit_disabled");
    }
    return;
  }

  const failClosed = options.failClosed ?? AUDIT_FAIL_CLOSED;

  const doc = {
    eventId: randomUUID(),
    timestamp: new Date(),
    requestId: ctx.requestId,
    userId: ctx.userId ?? null,
    userRole: ctx.userRole ?? null,
    operation: truncate(event.operation, 128),
    operationType: event.operationType,
    resourceType: truncate(event.resourceType, 64),
    result: event.result,
    reason: event.reason ? truncate(event.reason, 128) : null,
    ip: ctx.ip ?? null,
    durationMs: event.durationMs ?? null,
    metadata: sanitizeMetadata(event.metadata),
    resourceId: safeResourceId(event.resourceId),
    userAgent: ctx.userAgent ? truncate(ctx.userAgent, 256) : null,
  };

  try {
    await getAuditModel().create([doc], {
      writeConcern: {
        w: AUDIT_WRITE_CONCERN,
        j: true,
      },
    });

    auditEventsTotal.inc({
      operation: doc.operation,
      resource_type: doc.resourceType,
      result: doc.result,
    });
  } catch (err) {
    auditWriteFailuresTotal.inc();
    logger.error(
      {
        err: sanitizeError(err),
        requestId: ctx.requestId,
        operation: doc.operation,
        resourceType: doc.resourceType,
      },
      "audit_write_failed",
    );

    if (failClosed) throw new AuditUnavailableError();
  }
}
