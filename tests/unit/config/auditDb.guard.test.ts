import { afterEach, describe, expect, it, jest } from "@jest/globals";

const ORIGINAL = process.env.MONGO_AUDIT_URI;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.MONGO_AUDIT_URI;
  else process.env.MONGO_AUDIT_URI = ORIGINAL;
  jest.resetModules();
});

describe("getAuditModel", () => {
  it("no cae a la conexión por defecto si hay URI dedicada sin conectar", async () => {
    process.env.MONGO_AUDIT_URI =
      "mongodb://127.0.0.1:27017/am_audit?replicaSet=rs0";
    jest.resetModules();

    const { getAuditModel } = await import("../../../config/auditDb.ts");

    expect(() => getAuditModel()).toThrow(/audit_db_not_ready/);
  });
});
