import mongoose from "mongoose";

const { Schema } = mongoose;

export const AUDIT_RESULTS = [
  "success",
  "denied",
  "not_found",
  "error",
  "attempt",
] as const;
export type AuditResult = (typeof AUDIT_RESULTS)[number];

export const AUDIT_OPERATION_TYPES = ["query", "mutation", "system"] as const;
export type AuditOperationType = (typeof AUDIT_OPERATION_TYPES)[number];

export const auditLogSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true },
    timestamp: { type: Date, required: true, default: () => new Date() },
    requestId: { type: String, required: true },
    userId: { type: String, default: null },
    userRole: { type: Number, default: null },
    operation: { type: String, required: true },
    operationType: {
      type: String,
      enum: AUDIT_OPERATION_TYPES,
      required: true,
    },
    resourceType: { type: String, required: true },
    resourceId: { type: String, default: null },
    result: { type: String, enum: AUDIT_RESULTS, required: true },
    reason: { type: String, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    durationMs: { type: Number, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    collection: "audit_logs",
    versionKey: false,
    timestamps: false,
    // Un campo no declarado es un error, no un descarte silencioso.
    strict: "throw",
  },
);

// En producción los índices se crean con scripts/audit-log-collection.js.
// Crear índices en cada arranque requiere privilegios que el usuario
// insert-only no debe tener.
auditLogSchema.set("autoIndex", process.env.NODE_ENV !== "production");

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ result: 1, timestamp: -1 });
auditLogSchema.index({ requestId: 1 });

// Query middleware que modifica o borra. findOneAndReplace también modifica:
// si falta, es un bypass del append-only.
auditLogSchema.pre(
  [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "findOneAndReplace",
    "replaceOne",
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
  ],
  function () {
    throw new Error("audit_logs is append-only");
  },
);

// bulkWrite no se puede declarar dentro del array: los tipos de Mongoose 8
// solo lo aceptan como literal suelto. Se permite insertOne y se bloquea
// cualquier update/delete.
auditLogSchema.pre("bulkWrite", function (next, ops) {
  if (ops.some((op) => !("insertOne" in op))) {
    return next(new Error("audit_logs is append-only"));
  }
  next();
});

auditLogSchema.pre("save", function (next) {
  if (!this.isNew) {
    return next(new Error("audit_logs is append-only"));
  }
  next();
});

export type AuditLogModel = mongoose.Model<any>;

/**
 * Crea (o reutiliza) el modelo en una conexión concreta.
 * Necesario para la conexión dedicada de auditoría (MONGO_AUDIT_URI).
 */
export function createAuditLogModel(conn: mongoose.Connection): AuditLogModel {
  return (
    (conn.models.AuditLog as AuditLogModel) ??
    conn.model("AuditLog", auditLogSchema)
  );
}

export default mongoose.model("AuditLog", auditLogSchema);
