// Ejecutar con un usuario archiver (find + delete en la DB de auditoría y
// readWrite en la DB de archivo). Nunca con el usuario de la app.
const sourceDbName =
  process.env.MONGO_AUDIT_DB ?? process.env.MONGO_APP_DB ?? "am_back";
const archiveDbName = process.env.AUDIT_ARCHIVE_DB ?? "am_archive";
const hotDays = Number(process.env.AUDIT_HOT_RETENTION_DAYS ?? 90);
const batchSize = Number(process.env.AUDIT_ARCHIVE_BATCH_SIZE ?? 5000);
const maxBatches = Number(process.env.AUDIT_ARCHIVE_MAX_BATCHES ?? 1000);

const cutoff = new Date(Date.now() - hotDays * 24 * 60 * 60 * 1000);
const source = db.getSiblingDB(sourceDbName).audit_logs;
const target = db.getSiblingDB(archiveDbName).audit_logs;

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
  `archived ${moved} audit events from ${sourceDbName} to ${archiveDbName} (hotDays=${hotDays})`,
);
