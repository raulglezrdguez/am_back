// Ejecutar con un usuario admin (mongosh "$MONGO_ADMIN_URI").
// Crea DB/colección de auditoría y usuarios con privilegios mínimos.
// Idempotente: se puede re-ejecutar sin borrar usuarios ni roles.
const appDb = process.env.MONGO_APP_DB ?? "am_back";
const archiveDb = process.env.AUDIT_ARCHIVE_DB ?? "am_archive";

// La app solo conoce MONGO_AUDIT_URI; los scripts pueden recibir
// MONGO_AUDIT_DB. Si ambas están definidas deben coincidir.
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

const auditDb = process.env.MONGO_AUDIT_DB || uriDbName || "am_audit";

const appUser = process.env.MONGO_APP_USER ?? "am_app";
const auditUser = process.env.MONGO_AUDIT_USER ?? "am_audit_writer";
const readerUser = process.env.MONGO_AUDIT_READER_USER ?? "am_audit_reader";
const archiverUser = process.env.MONGO_ARCHIVER_USER ?? "am_archiver";

const appPwd = process.env.MONGO_APP_PASSWORD;
const auditPwd = process.env.MONGO_AUDIT_PASSWORD;
const readerPwd = process.env.MONGO_AUDIT_READER_PASSWORD;
const archiverPwd = process.env.MONGO_ARCHIVER_PASSWORD;

for (const [name, value] of Object.entries({
  MONGO_APP_PASSWORD: appPwd,
  MONGO_AUDIT_PASSWORD: auditPwd,
  MONGO_AUDIT_READER_PASSWORD: readerPwd,
  MONGO_ARCHIVER_PASSWORD: archiverPwd,
})) {
  if (!value) throw new Error(`${name} es obligatorio`);
}

if (auditDb === appDb && process.env.ALLOW_SHARED_AUDIT_DB !== "true") {
  throw new Error(
    "auditDb === appDb: el usuario de la app podría borrar audit_logs. " +
      "Usa una DB dedicada o define ALLOW_SHARED_AUDIT_DB=true (no recomendado).",
  );
}

const adminDb = db.getSiblingDB("admin");
const audit = db.getSiblingDB(auditDb);

if (!audit.getCollectionNames().includes("audit_logs")) {
  audit.createCollection("audit_logs");
}

const roleExists = (name) => {
  try {
    return adminDb.getRole(name) !== null;
  } catch {
    return false;
  }
};

// Los roles se crean SIEMPRE en admin. Por eso se conceden con db:"admin":
// MongoDB resuelve {role, db} contra esa base, no contra la base a la que
// apuntan los privilegios del rol.
const ensureRole = (name, privileges, roles = []) => {
  if (roleExists(name)) {
    adminDb.updateRole(name, { privileges, roles });
    print(`role ${name}: actualizado`);
  } else {
    adminDb.createRole({ role: name, privileges, roles });
    print(`role ${name}: creado`);
  }
};

const ensureUser = (user, pwd, roles) => {
  const existing = adminDb.getUser(user);
  if (existing) {
    adminDb.updateUser(user, { pwd, roles });
    print(`user ${user}: actualizado`);
  } else {
    adminDb.createUser({ user, pwd, roles });
    print(`user ${user}: creado`);
  }
};

// Verificación: un "createUser" que silenciosamente no aplica el rol dejaría
// la app sin poder escribir y el fallo solo aparecería en producción.
const assertGranted = (user, role) => {
  const info = adminDb.getUser(user);
  const granted =
    info && info.roles.some((r) => r.role === role && r.db === "admin");
  if (!granted) {
    throw new Error(`grant_missing: ${user} no tiene ${role}@admin`);
  }
};

// Insert-only sobre la colección de auditoría.
ensureRole("auditWriter", [
  {
    resource: { db: auditDb, collection: "audit_logs" },
    actions: ["insert"],
  },
]);

// Lectura para compliance/SIEM.
ensureRole("auditReader", [
  {
    resource: { db: auditDb, collection: "audit_logs" },
    actions: ["find"],
  },
]);

// Archivado: leer y borrar en caliente; readWrite en la DB de archivo.
ensureRole("auditArchiveSource", [
  {
    resource: { db: auditDb, collection: "audit_logs" },
    actions: ["find", "remove"],
  },
]);

ensureUser(appUser, appPwd, [{ role: "readWrite", db: appDb }]);
ensureUser(auditUser, auditPwd, [{ role: "auditWriter", db: "admin" }]);
ensureUser(readerUser, readerPwd, [{ role: "auditReader", db: "admin" }]);
ensureUser(archiverUser, archiverPwd, [
  { role: "auditArchiveSource", db: "admin" },
  { role: "readWrite", db: archiveDb },
]);

assertGranted(auditUser, "auditWriter");
assertGranted(readerUser, "auditReader");
assertGranted(archiverUser, "auditArchiveSource");

print(
  `OK: ${appUser}=readWrite(${appDb}); ${auditUser}=insert(${auditDb}.audit_logs); ` +
    `${readerUser}=find; ${archiverUser}=find/remove(${auditDb})+readWrite(${archiveDb})`,
);
