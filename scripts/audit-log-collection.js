// Ejecutar con un usuario con privilegios de administración de la DB.
// mongosh "$MONGO_ADMIN_URI" scripts/audit-log-collection.js
//
// La colección debe crearse en la MISMA base de datos a la que apunta
// MONGO_AUDIT_URI. Si no hay DB dedicada, se usa la de la app (modo
// compatibilidad), pero se avisa: el usuario de la app podría borrar los logs.
const appDbName = process.env.MONGO_APP_DB ?? "am_back";
const auditUri = process.env.MONGO_AUDIT_URI ?? "";
// Sin depender de URL (mongosh no la garantiza):
// mongodb[+srv]://[usuario:pass@]host[:puerto]/<db>?opciones
const uriDbName = (() => {
  const match = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/.exec(auditUri);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
})();
const dbName = process.env.MONGO_AUDIT_DB || uriDbName || appDbName;

// Si ambas fuentes están definidas y discrepan, el script estaría creando
// índices en una DB distinta de la que escribe la app. Mejor abortar.
if (
  process.env.MONGO_AUDIT_DB &&
  uriDbName &&
  process.env.MONGO_AUDIT_DB !== uriDbName
) {
  throw new Error(
    `MONGO_AUDIT_DB=${process.env.MONGO_AUDIT_DB} no coincide con la DB de ` +
      `MONGO_AUDIT_URI=${uriDbName}. Corrige una de las dos.`,
  );
}
const audit = db.getSiblingDB(dbName);

if (dbName === appDbName && process.env.NODE_ENV === "production") {
  throw new Error(
    "En producción la auditoría debe vivir en una DB separada (MONGO_AUDIT_URI)",
  );
}
print(`audit-log-collection: destino ${dbName}.audit_logs`);

const validator = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "eventId",
      "timestamp",
      "requestId",
      "operation",
      "operationType",
      "resourceType",
      "result",
    ],
    properties: {
      eventId: { bsonType: "string" },
      timestamp: { bsonType: "date" },
      requestId: { bsonType: "string" },
      userId: { bsonType: ["string", "null"] },
      userRole: { bsonType: ["int", "long", "double", "null"] },
      operation: { bsonType: "string" },
      operationType: { enum: ["query", "mutation", "system"] },
      resourceType: { bsonType: "string" },
      resourceId: { bsonType: ["string", "null"] },
      result: {
        enum: ["success", "denied", "not_found", "error", "attempt"],
      },
      reason: { bsonType: ["string", "null"] },
      ip: { bsonType: ["string", "null"] },
      userAgent: { bsonType: ["string", "null"] },
      durationMs: { bsonType: ["int", "long", "double", "null"] },
      metadata: { bsonType: "object" },
    },
  },
};

if (!audit.getCollectionNames().includes("audit_logs")) {
  audit.createCollection("audit_logs", {
    validator,
    validationLevel: "strict",
    validationAction: "error",
  });
} else {
  audit.runCommand({
    collMod: "audit_logs",
    validator,
    validationLevel: "strict",
    validationAction: "error",
  });
}

audit.audit_logs.createIndex({ eventId: 1 }, { unique: true });
audit.audit_logs.createIndex({ timestamp: -1 });
audit.audit_logs.createIndex({ userId: 1, timestamp: -1 });
audit.audit_logs.createIndex({ resourceType: 1, resourceId: 1, timestamp: -1 });
audit.audit_logs.createIndex({ result: 1, timestamp: -1 });
audit.audit_logs.createIndex({ requestId: 1 });

print(
  `OK: ${dbName}.audit_logs validado e indexado ` +
    `(${dbName === appDbName ? "MODO COMPATIBILIDAD: misma DB que la app" : "DB dedicada"})`,
);
