import jwt from "jsonwebtoken";
import request from "supertest";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  jest,
} from "@jest/globals";
import { createServer } from "../../app.ts";
import { closeTestDB, connectTestDB } from "./setup.ts";
import { JWT_SECRET } from "../../config/index.ts";
import User from "../../models/user.model.ts";
import Patient from "../../models/patient.model.ts";
import AuditLog from "../../models/auditLog.model.ts";

const gql = (q: any) => ({ query: q });

let httpServer: any;
let apolloServer: any;

beforeAll(async () => {
  await connectTestDB();
  ({ httpServer, apolloServer } = await createServer());
});

afterAll(async () => {
  (global as any).__TEST_TEAR_DOWN__ = true;
  await apolloServer.stop();
  await closeTestDB();
  await new Promise((resolve) => httpServer.close(resolve));
});

afterEach(async () => {
  await User.deleteMany({});
  await Patient.deleteMany({});
  // Bypass deliberado del guard append-only SOLO en tests: usa el driver
  // nativo, que no pasa por los hooks de Mongoose.
  await AuditLog.collection.deleteMany({});
});

describe("auditoría PHI", () => {
  it("registra una lectura con usuario, recurso y requestId", async () => {
    const user = await User.create({ name: "U", email: "u@test.com" });
    const patient = await Patient.create({
      identifier: "P-AUDIT",
      name: "Paciente",
      owner: user._id,
    });
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      JWT_SECRET,
    );

    const res = await request(httpServer)
      .post("/graphql")
      .set("authorization", `Bearer ${token}`)
      .send({
        query: `query($id:ID!){ patient(id:$id){ _id } }`,
        variables: { id: patient._id.toString() },
      })
      .expect(200);

    expect(res.body.errors).toBeUndefined();

    const requestId = res.headers["x-request-id"];
    expect(requestId).toBeTruthy();

    const event = await AuditLog.findOne({
      operation: "patient",
      requestId,
    }).lean();

    expect(event).toMatchObject({
      userId: user._id.toString(),
      resourceType: "Patient",
      resourceId: patient._id.toString(),
      result: "success",
      requestId,
    });
    expect(JSON.stringify(event)).not.toContain("medicalHistory");
    expect(JSON.stringify(event)).not.toContain("Paciente");
  });

  it("no devuelve PHI si la auditoría falla (fail-closed)", async () => {
    const spy = jest
      .spyOn(AuditLog, "create")
      .mockRejectedValueOnce(new Error("mongo down"));

    try {
      const user = await User.create({
        name: "Bob",
        email: "bob@test.com",
      });
      const patient = await Patient.create({
        identifier: "P123",
        name: "Alice",
        owner: `${user._id}`,
      });
      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
      }
      const token = jwt.sign(
        { id: user._id, email: user.email, status: 1, role: 1 },
        JWT_SECRET,
      );

      const res = await request(httpServer)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(
          gql(`
            query {
              patients {
                _id
                identifier
                name
              }
            }
          `),
        )
        .expect(200);

      expect(res.body.errors?.[0]?.extensions?.code).toBe(
        "SERVICE_UNAVAILABLE",
      );
      expect(res.body.data?.patients).toBeFalsy();
    } finally {
      spy.mockRestore();
    }
  });
});
