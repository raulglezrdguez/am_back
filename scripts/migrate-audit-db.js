// Migra audit_logs de la DB de la app a la DB dedicada.
// Ejecutar con un usuario admin y, preferiblemente, con la app parada.
//   mongosh "$MONGO_ADMIN_URI" scripts/migrate-audit-db.js
// Dry-run por defecto; para aplicar:
//   AUDIT_MIGRATE_APPLY=true mongosh "$MONGO_ADMIN_URI" scripts/migrate-audit-db.js
const apply = process.env.AUDIT_MIGRATE_APPLY === "true";
const sourceDbName = process.env.MONGO_APP_DB ?? "am_back";
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
const targetDbName = process.env.MONGO_AUDIT_DB || uriDbName;
if (!targetDbName) {
  throw new Error("Define MONGO_AUDIT_DB o MONGO_AUDIT_URI");
}
if (
  process.env.MONGO_AUDIT_DB &&
  uriDbName &&
  process.env.MONGO_AUDIT_DB !== uriDbName
) {
  throw new Error(
    `MONGO_AUDIT_DB=${process.env.MONGO_AUDIT_DB} no coincide con la DB de MONGO_AUDIT_URI=${uriDbName}`,
  );
}
if (targetDbName === sourceDbName) {
  throw new Error("Origen y destino son la misma DB");
}

const source = db.getSiblingDB(sourceDbName).audit_logs;
const target = db.getSiblingDB(targetDbName).audit_logs;
const batchSize = Number(process.env.AUDIT_MIGRATION_BATCH_SIZE ?? 5000);

const total = source.countDocuments({});
print(
  `migrando ${total} eventos de ${sourceDbName} a ${targetDbName} ` +
    `(batch=${batchSize}, apply=${apply})`,
);

let moved = 0;
let batches = 0;

while (true) {
  const batch = source
    .find({})
    .sort({ timestamp: 1 })
    .limit(batchSize)
    .toArray();
  if (batch.length === 0) break;
  batches += 1;

  if (!apply) {
    print(`[dry-run] lote ${batches}: movería ${batch.length} eventos`);
    moved += batch.length;
    if (batch.length < batchSize) break;
    continue;
  }

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

  const ids = batch.map((d) => d._id);
  const copied = target.countDocuments({ _id: { $in: ids } });
  if (copied !== ids.length) {
    throw new Error(
      `verificación fallida: esperados ${ids.length}, copiados ${copied}`,
    );
  }

  source.deleteMany({ _id: { $in: ids } });
  moved += ids.length;
  print(`lote ${batches}: ${ids.length} movidos (total ${moved})`);

  if (batch.length < batchSize) break;
}

print(
  apply
    ? `OK: ${moved} eventos migrados; origen restante=${source.countDocuments({})}`
    : `dry-run: ${moved} eventos se moverían; no se ha modificado nada`,
);
