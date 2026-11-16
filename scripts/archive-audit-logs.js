// Ejecutar con un usuario archiver (find + remove en la DB de auditoría y
// readWrite en la DB de archivo). Nunca con el usuario de la app.
//
// Dry-run por defecto; para aplicar:
//   AUDIT_ARCHIVE_APPLY=true mongosh "$MONGO_ARCHIVER_URI" scripts/archive-audit-logs.js
const apply = process.env.AUDIT_ARCHIVE_APPLY === "true";

const auditUri = process.env.MONGO_AUDIT_URI ?? "";
const uriDbName = (() => {
  const match = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/.exec(auditUri);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
})();
if (
  process.env.MONGO_AUDIT_DB &&
  uriDbName &&
  process.env.MONGO_AUDIT_DB !== uriDbName
) {
  throw new Error(
    `MONGO_AUDIT_DB=${process.env.MONGO_AUDIT_DB} no coincide con la DB de ` +
      `MONGO_AUDIT_URI=${uriDbName}`,
  );
}

const sourceDbName =
  process.env.MONGO_AUDIT_DB ||
  uriDbName ||
  process.env.MONGO_APP_DB ||
  "am_back";
const archiveDbName = process.env.AUDIT_ARCHIVE_DB ?? "am_archive";
const hotDays = Number(process.env.AUDIT_HOT_RETENTION_DAYS ?? 90);
const batchSize = Number(process.env.AUDIT_ARCHIVE_BATCH_SIZE ?? 5000);
const maxBatches = Number(process.env.AUDIT_ARCHIVE_MAX_BATCHES ?? 1000);

if (hotDays <= 0) throw new Error("AUDIT_HOT_RETENTION_DAYS debe ser > 0");
if (sourceDbName === archiveDbName) {
  throw new Error("La DB de auditoría y la de archivo no pueden ser la misma");
}

const cutoff = new Date(Date.now() - hotDays * 24 * 60 * 60 * 1000);
const source = db.getSiblingDB(sourceDbName).audit_logs;
const target = db.getSiblingDB(archiveDbName).audit_logs;

const candidates = source.countDocuments({ timestamp: { $lt: cutoff } });
print(
  `archive: ${candidates} eventos anteriores a ${cutoff.toISOString()} ` +
    `(${sourceDbName} → ${archiveDbName}, hotDays=${hotDays}, apply=${apply})`,
);

if (!apply || candidates === 0) {
  print("dry-run: no se ha movido nada");
  quit(0);
}

let moved = 0;
let batches = 0;

while (batches < maxBatches) {
  batches += 1;

  const batch = source
    .find({ timestamp: { $lt: cutoff } })
    .sort({ timestamp: 1 })
    .limit(batchSize)
    .toArray();

  if (batch.length === 0) break;

  // upsert: re-ejecutar el script no duplica ni falla por _id existente.
  target.bulkWrite(
    batch.map((doc) => ({
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc,
        upsert: true,
      },
    })),
    { ordered: false },
  );

  const ids = batch.map((doc) => doc._id);
  const archived = target.countDocuments({ _id: { $in: ids } });
  if (archived !== ids.length) {
    throw new Error(
      `archive_verification_failed: expected ${ids.length}, found ${archived}`,
    );
  }

  source.deleteMany({ _id: { $in: ids } });
  moved += ids.length;

  if (batch.length < batchSize) break;
}

print(
  `archived ${moved} audit events from ${sourceDbName} to ${archiveDbName} ` +
    `(hotDays=${hotDays})`,
);
