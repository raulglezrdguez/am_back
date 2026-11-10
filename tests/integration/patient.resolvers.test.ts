import jwt from "jsonwebtoken";
import request from "supertest";
import { Types } from "mongoose";

import { createServer } from "../../app.ts";
import User from "../../models/user.model.ts";
import Patient from "../../models/patient.model.ts";

import { closeTestDB, connectTestDB } from "./setup.ts";
import { JWT_SECRET } from "../../config/index.ts";

let httpServer: import("http").Server;
beforeAll(async () => {
  await connectTestDB();
  ({ httpServer } = await createServer());
});

afterAll(async () => {
  (global as any).__TEST_TEAR_DOWN__ = true;

  await closeTestDB();

  await new Promise((resolve) => httpServer.close(resolve));

  const admin = await import("firebase-admin");
  const apps = admin.apps;
  for (let i = 0; i < apps?.length; i++) {
    await apps[i]?.delete();
  }
});

afterEach(async () => {
  await User.deleteMany({});
  await Patient.deleteMany({});
});

const gql = (q: any) => ({ query: q });

describe("Patient Resolvers", () => {
  describe("Query patients", () => {
    it("should return empty array if not authenticated", async () => {
      const res = await request(httpServer)
        .post("/graphql")
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

      expect(res.body.data.patients).toEqual([]);
    });

    it("should return only my patients", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@test.com",
        role: 1,
        status: 1,
      });

      const otherUser = await User.create({
        name: "Other User",
        email: "other@test.com",
        role: 1,
        status: 1,
      });

      await Patient.create({
        identifier: "P001",
        name: "John Doe",
        owner: user._id,
        public: false,
      });

      await Patient.create({
        identifier: "P002",
        name: "Jane Smith",
        owner: otherUser._id,
        public: false,
      });

      if (!JWT_SECRET)
        throw new Error("JWT_SECRET is not defined in environment variables");

      const token = jwt.sign(
        { id: user._id, email: user.email, role: 1, status: 1 },
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

      const patients = res.body.data.patients;
      expect(patients.length).toBe(1);
      expect(patients[0].identifier).toBe("P001");
    });
  });

  describe("Query patient", () => {
    it("should return null if not authenticated", async () => {
      const patient = await Patient.create({
        identifier: "P001",
        name: "John Doe",
        owner: new Types.ObjectId(),
        public: false,
      });

      const res = await request(httpServer)
        .post("/graphql")
        .send(
          gql(`
          query {
            patient(id: "${patient._id}") {
              _id
              identifier
              name
            }
          }
        `),
        )
        .expect(200);

      expect(res.body.data.patient).toBeNull();
    });

    it("should return patient by ID only if it belongs to the owner", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@test.com",
        role: 1,
        status: 1,
      });

      const otherUser = await User.create({
        name: "Other User",
        email: "other@test.com",
        role: 1,
        status: 1,
      });

      const patient1 = await Patient.create({
        identifier: "P001",
        name: "John Doe",
        owner: user._id,
        public: false,
      });

      await Patient.create({
        identifier: "P002",
        name: "Jane Smith",
        owner: otherUser._id,
        public: false,
      });

      if (!JWT_SECRET)
        throw new Error("JWT_SECRET is not defined in environment variables");

      const token = jwt.sign(
        { id: user._id, email: user.email, role: 1, status: 1 },
        JWT_SECRET,
      );

      const res = await request(httpServer)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(
          gql(`
          query {
            patient(id: "${patient1._id}") {
              _id
              identifier
              name
            }
          }
        `),
        )
        .expect(200);

      const fetchedPatient = res.body.data.patient;
      expect(fetchedPatient).not.toBeNull();
      expect(fetchedPatient.identifier).toBe("P001");
      expect(fetchedPatient.name).toBe("John Doe");
    });

    it("should return null when trying to access a patient that does not belong to the user", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@test.com",
        role: 1,
        status: 1,
      });

      const otherUser = await User.create({
        name: "Other User",
        email: "other@test.com",
        role: 1,
        status: 1,
      });

      const patient2 = await Patient.create({
        identifier: "P002",
        name: "Jane Smith",
        owner: otherUser._id,
        public: false,
      });

      if (!JWT_SECRET)
        throw new Error("JWT_SECRET is not defined in environment variables");

      const token = jwt.sign(
        { id: user._id, email: user.email, role: 1, status: 1 },
        JWT_SECRET,
      );

      const res = await request(httpServer)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(
          gql(`
          query {
            patient(id: "${patient2._id}") {
              _id
              identifier
              name
            }
          }
        `),
        )
        .expect(200);

      expect(res.body.data.patient).toBeNull();
    });
  });

  describe("Query patientBy", () => {
    it("should get patients of the current user by identifier or name", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@test.com",
        role: 1,
        status: 1,
      });
      const otherUser = await User.create({
        name: "Other User",
        email: "other@test.com",
        role: 1,
        status: 1,
      });

      await Patient.create({
        identifier: "P001",
        name: "John Doe",
        owner: user._id,
        public: false,
      });
      await Patient.create({
        identifier: "P002",
        name: "Jane Smith",
        owner: otherUser._id,
        public: true,
      });

      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
      }
      const token = jwt.sign(
        { id: user._id, email: user.email, role: 1, status: 1 },
        JWT_SECRET,
      );

      let res = await request(httpServer)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(gql(`query { patientBy(name: "John") { _id identifier name } }`))
        .expect(200);

      expect(res.body.data.patientBy).toHaveLength(1);
      expect(res.body.data.patientBy[0].identifier).toBe("P001");

      // P002 existe, pero pertenece a otro usuario → no debe verse
      res = await request(httpServer)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(
          gql(
            `query { patientBy(identifier: "P002") { _id identifier name } }`,
          ),
        )
        .expect(200);

      expect(res.body.data.patientBy).toHaveLength(0);
    });
  });

  describe("Mutation createPatient", () => {
    it("should create a new patient", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@test.com",
        role: 1,
        status: 1,
      });

      if (!JWT_SECRET)
        throw new Error("JWT_SECRET is not defined in environment variables");

      const token = jwt.sign(
        { id: user._id, email: user.email, role: 1, status: 1 },
        JWT_SECRET,
      );

      const res = await request(httpServer)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(
          gql(`
          mutation {
            createPatient(input: {
              identifier: "P001",
              name: "John Doe",
              birthDate: "10-12-1980",
            }) {
              _id
              identifier
              name
              birthDate
              owner {
                id
                email
              }
            }
          }
        `),
        )
        .expect(200);
      const createdPatient = res.body.data.createPatient;
      expect(createdPatient).toBeDefined();
      expect(createdPatient.identifier).toBe("P001");
      expect(createdPatient.name).toBe("John Doe");
      expect(createdPatient.birthDate).toBe("10-12-1980");
      expect(createdPatient.owner.id).toBe(user._id.toString());
      expect(createdPatient.owner.email).toBe(user.email);
    });

    it("should not create patient if not authenticated", async () => {
      const res = await request(httpServer)
        .post("/graphql")
        .send(
          gql(`
          mutation {
            createPatient(input: {
              identifier: "P001",
              name: "John Doe",
              birthDate: "10-12-1980",
            }) {
              _id
              identifier
              name
              birthDate
            }
          }
        `),
        )
        .expect(200);

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toBe("Authentication required");
      expect(res.body.data.createPatient).toBeNull();
    });

    it("should not create patient with missing required fields", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@test.com",
        role: 1,
        status: 1,
      });

      if (!JWT_SECRET)
        throw new Error("JWT_SECRET is not defined in environment variables");

      const token = jwt.sign(
        { id: user._id, email: user.email, role: 1, status: 1 },
        JWT_SECRET,
      );

      const res = await request(httpServer)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(
          gql(`
          mutation {
            createPatient(input: {
              name: "John Doe",
              birthDate: "10-12-1980",
            }) {
              _id
              identifier
              name
              birthDate
            }
          }
        `),
        )
        .expect(400);

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toContain(
        'Field "CreatePatientInput.identifier" of required type "String!" was not provided.',
      );
    });
  });

  describe("Mutation updatePatient", () => {
    it("should update a patient", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@test.com",
        role: 1,
        status: 1,
      });

      const patient = await Patient.create({
        identifier: "P001",
        name: "John Doe",
        owner: user._id,
      });

      if (!JWT_SECRET)
        throw new Error("JWT_SECRET is not defined in environment variables");

      const token = jwt.sign(
        { id: user._id, email: user.email, role: 1, status: 1 },
        JWT_SECRET,
      );

      const mutation = `
          mutation {
            updatePatient(id: "${patient._id}", input: {
              name: "John Updated",
            }) {
              _id
              identifier
              name
            }
          }
        `;
      const res = await request(httpServer)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(gql(mutation))
        .expect(200);

      const updatedPatient = res.body.data.updatePatient;
      expect(updatedPatient).toBeDefined();
      expect(updatedPatient.name).toBe("John Updated");
    });

    it("should not update patient if not authenticated", async () => {
      const patient = await Patient.create({
        identifier: "P001",
        name: "John Doe",
        owner: new Types.ObjectId(),
      });

      const res = await request(httpServer)
        .post("/graphql")
        .send(
          gql(`
          mutation {
            updatePatient(id: "${patient._id}", input: {
              name: "John Updated",
            }) {
              _id
              identifier
              name
            }
          }
        `),
        )
        .expect(200);

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toBe("Authentication required");
      expect(res.body.data.updatePatient).toBeNull();
    });

    it("should not update patient that does not belong to the user", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@test.com",
        role: 1,
        status: 1,
      });

      const otherUser = await User.create({
        name: "Other User",
        email: "other@test.com",
        role: 1,
        status: 1,
      });

      const patient = await Patient.create({
        identifier: "P001",
        name: "John Doe",
        owner: otherUser._id,
      });

      if (!JWT_SECRET)
        throw new Error("JWT_SECRET is not defined in environment variables");

      const token = jwt.sign(
        { id: user._id, email: user.email, role: 1, status: 1 },
        JWT_SECRET,
      );

      const res = await request(httpServer)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(
          gql(`
          mutation {
            updatePatient(id: "${patient._id}", input: {
              name: "John Updated",
            }) {
              _id
              identifier
              name
            }
          }
        `),
        )
        .expect(200);

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toBe("Patient not found");
      expect(res.body.data.updatePatient).toBeNull();
    });
  });

  describe("Mutation deletePatient", () => {
    it("should delete a patient", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@test.com",
        role: 1,
        status: 1,
      });

      const patient = await Patient.create({
        identifier: "P001",
        name: "John Doe",
        owner: user._id,
        public: false,
      });

      if (!JWT_SECRET)
        throw new Error("JWT_SECRET is not defined in environment variables");

      const token = jwt.sign(
        { id: user._id, email: user.email, role: 1, status: 1 },
        JWT_SECRET,
      );

      const mutation = `
          mutation {
            deletePatient(id: "${patient._id}") {
                _id
            }
          }
        `;
      const res = await request(httpServer)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(gql(mutation))
        .expect(200);

      const deletedPatient = res.body.data.deletePatient;
      expect(deletedPatient).toBeDefined();
      expect(deletedPatient._id).toBe(patient._id.toString());
    });

    it("should not delete patient if not authenticated", async () => {
      const patient = await Patient.create({
        identifier: "P001",
        name: "John Doe",
        owner: new Types.ObjectId(),
        public: false,
      });

      const mutation = `
          mutation {
            deletePatient(id: "${patient._id}") {
                _id
            }
          }
        `;

      const res = await request(httpServer)
        .post("/graphql")
        .send(gql(mutation))
        .expect(200);

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toBe("Authentication required");
      expect(res.body.data).toBeNull();
    });

    it("should not delete patient that does not belong to the user", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@test.com",
        role: 1,
        status: 1,
      });

      const otherUser = await User.create({
        name: "Other User",
        email: "other@test.com",
        role: 1,
        status: 1,
      });

      const patient = await Patient.create({
        identifier: "P001",
        name: "John Doe",
        owner: otherUser._id,
        public: true,
      });

      if (!JWT_SECRET)
        throw new Error("JWT_SECRET is not defined in environment variables");

      const token = jwt.sign(
        { id: user._id, email: user.email, role: 1, status: 1 },
        JWT_SECRET,
      );

      const mutation = `
          mutation {
            deletePatient(id: "${patient._id}") {
                _id
            }
          }
        `;

      const res = await request(httpServer)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(gql(mutation))
        .expect(200);

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toBe("Patient not found");
      expect(res.body.data).toBeNull();
    });
  });
});
