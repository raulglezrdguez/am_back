import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";
import AuditLog from "../../models/auditLog.model.ts";
import { closeTestDB, connectTestDB } from "./setup.ts";

const baseDoc = (eventId: string) => ({
  eventId,
  timestamp: new Date(),
  requestId: "req-append-only",
  operation: "patient",
  operationType: "query" as const,
  resourceType: "Patient",
  result: "success" as const,
});

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  // Driver nativo: bypass deliberado del guard.
  await AuditLog.collection.deleteMany({});
});

describe("audit_logs es append-only", () => {
  it("permite insertar", async () => {
    await expect(AuditLog.create([baseDoc("a1")])).resolves.toHaveLength(1);
  });

  it("bloquea updateMany y deleteMany", async () => {
    await AuditLog.create([baseDoc("a2")]);
    await expect(
      AuditLog.updateMany({}, { $set: { reason: "x" } }),
    ).rejects.toThrow(/append-only/);
    await expect(AuditLog.deleteMany({})).rejects.toThrow(/append-only/);
  });

  it("bloquea findOneAndReplace", async () => {
    await AuditLog.create([baseDoc("a3")]);
    await expect(
      AuditLog.findOneAndReplace({ eventId: "a3" }, baseDoc("a3")),
    ).rejects.toThrow(/append-only/);
  });

  it("bloquea bulkWrite con update/delete y permite insertOne", async () => {
    await AuditLog.create([baseDoc("a4")]);
    await expect(
      AuditLog.bulkWrite([
        {
          updateOne: {
            filter: { eventId: "a4" },
            update: { $set: { reason: "x" } },
          },
        },
      ]),
    ).rejects.toThrow(/append-only/);
    await expect(
      AuditLog.bulkWrite([{ insertOne: { document: baseDoc("a5") } }]),
    ).resolves.toBeDefined();
  });
});
