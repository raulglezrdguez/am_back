// Destruye eventos del archivo que superan la retención legal.
// Ejecutar SOLO con el usuario archiver y con legal/DPO informado.
// Dry-run por defecto; para aplicar:
//   AUDIT_PURGE_APPLY=true mongosh "$MONGO_ARCHIVER_URI" scripts/purge-audit-archive.js
const apply = process.env.AUDIT_PURGE_APPLY === "true";
const archiveDbName = process.env.AUDIT_ARCHIVE_DB ?? "am_archive";
const retentionDays = Number(process.env.AUDIT_RETENTION_DAYS ?? 2190);

if (process.env.AUDIT_LEGAL_HOLD === "true") {
  print("AUDIT_LEGAL_HOLD=true: purga suspendida");
  quit(0);
}

const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
const archive = db.getSiblingDB(archiveDbName).audit_logs;
const candidates = archive.countDocuments({ timestamp: { $lt: cutoff } });

print(
  `purge: ${candidates} eventos anteriores a ${cutoff.toISOString()} ` +
    `(retención ${retentionDays} días, apply=${apply})`,
);

if (!apply || candidates === 0) {
  print("dry-run: no se ha borrado nada");
  quit(0);
}

const result = archive.deleteMany({ timestamp: { $lt: cutoff } });
print(`OK: ${result.deletedCount} eventos destruidos del archivo`);
