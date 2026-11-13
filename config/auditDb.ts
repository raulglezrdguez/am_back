import mongoose from "mongoose";
import { MONGO_AUDIT_URI } from "./index.ts";
import {
  createAuditLogModel,
  type AuditLogModel,
} from "../models/auditLog.model.ts";
import DefaultAuditLog from "../models/auditLog.model.ts";
import { logger, sanitizeError } from "../middlewares/logger.ts";

let auditConnection: mongoose.Connection | null = null;
let auditModel: AuditLogModel | null = null;

export const isAuditDbConfigured = (): boolean => Boolean(MONGO_AUDIT_URI);

/**
 * Conexión dedicada a audit_logs.
 * - Usuario insert-only en la DB de auditoría.
 * - autoIndex:false: los índices los crea el DBA con
 *   scripts/audit-log-collection.js.
 * - bufferCommands:false: si la DB cae, el fail-closed es inmediato en lugar
 *   de esperar bufferTimeoutMS (10 s) + serverSelectionTimeoutMS.
 */
export async function connectAuditDB(): Promise<void> {
  if (!MONGO_AUDIT_URI || auditConnection) return;

  const conn = mongoose.createConnection(MONGO_AUDIT_URI, {
    autoIndex: false,
    bufferCommands: false,
    serverSelectionTimeoutMS: 2_000,
    connectTimeoutMS: 5_000,
    maxPoolSize: 5,
    minPoolSize: 0,
  });

  conn.on("error", (err) =>
    logger.error({ err: sanitizeError(err) }, "audit_db_error"),
  );
  conn.on("disconnected", () => logger.warn("audit_db_disconnected"));
  conn.on("reconnected", () => logger.info("audit_db_reconnected"));

  try {
    await conn.asPromise();
    auditModel = createAuditLogModel(conn);
    auditConnection = conn;
    logger.info("audit_db_connected");
  } catch (err) {
    // No dejar una conexión a medio abrir reintentando en segundo plano.
    await conn.destroy().catch(() => undefined);
    throw err;
  }
}

export function getAuditModel(): AuditLogModel {
  // Si hay URI dedicada pero el modelo aún no está listo, NO caer a la
  // conexión por defecto: eso escribiría en la DB de la app y rompería el
  // aislamiento. El error lo convierte writeAuditEvent en fallo cerrado.
  if (MONGO_AUDIT_URI && !auditModel) {
    throw new Error("audit_db_not_ready");
  }
  return auditModel ?? DefaultAuditLog;
}

export function getAuditConnection(): mongoose.Connection | null {
  return auditConnection;
}

export async function closeAuditDB(): Promise<void> {
  if (!auditConnection) return;

  const conn = auditConnection;
  auditConnection = null;
  auditModel = null;

  await conn.close(false);
  logger.info("audit_db_closed");
}

export const isAuditDbDedicated = (): boolean => auditConnection !== null;
