import { describe, it, expect, jest, afterEach } from "@jest/globals";
import {
  AuditUnavailableError,
  writeAuditEvent,
} from "../../../services/audit.service.ts";
import { getAuditModel } from "../../../config/auditDb.ts";

// getAuditModel() devuelve el modelo de la conexión dedicada si existe y el
// de la conexión por defecto si no. Espiar ese objeto hace que el test siga
// siendo válido con MONGO_AUDIT_URI definida.
const spyOnCreate = () => jest.spyOn(getAuditModel(), "create");

const ctx = {
  requestId: "req-test-1",
  userId: "6af721ee897b05fcc5d0ed61",
  userRole: 1,
  ip: "127.0.0.1",
  userAgent: "jest",
};

const base = {
  operation: "patient",
  operationType: "query" as const,
  resourceType: "Patient",
  resourceId: "6af721ee897b05fcc5d0ed61",
  result: "success" as const,
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("writeAuditEvent", () => {
  it("descarta metadata no permitida (nunca escribe PHI)", async () => {
    const spy = spyOnCreate().mockResolvedValue([] as any);

    await writeAuditEvent(
      {
        ...base,
        metadata: {
          resultCount: 3,
          name: "John Doe",
          medicalHistory: "HIV",
          email: "john@example.com",
        },
      },
      ctx,
    );

    const doc = (spy.mock.calls[0][0] as any[])[0];
    expect(doc.metadata).toEqual({ resultCount: 3 });
    expect(JSON.stringify(doc)).not.toContain("John Doe");
    expect(JSON.stringify(doc)).not.toContain("HIV");
  });

  it("lanza AuditUnavailableError si failClosed y la escritura falla", async () => {
    spyOnCreate().mockRejectedValueOnce(new Error("mongo down"));

    await expect(
      writeAuditEvent(base, ctx, { failClosed: true }),
    ).rejects.toBeInstanceOf(AuditUnavailableError);
  });

  it("no lanza si failClosed=false (post-auditoría best-effort)", async () => {
    spyOnCreate().mockRejectedValueOnce(new Error("mongo down"));

    await expect(
      writeAuditEvent(base, ctx, { failClosed: false }),
    ).resolves.toBeUndefined();
  });

  it("rechaza resourceId que no es ObjectId", async () => {
    const spy = spyOnCreate().mockResolvedValue([] as any);

    await writeAuditEvent({ ...base, resourceId: "not-an-object-id" }, ctx);

    const doc = (spy.mock.calls[0][0] as any[])[0];
    expect(doc.resourceId).toBeNull();
  });
});
