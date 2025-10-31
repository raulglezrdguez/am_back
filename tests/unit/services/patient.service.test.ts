import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import User from "../../../models/user.model.ts";
import Patient from "../../../models/patient.model.ts";

import * as PatientService from "../../../services/patient.service.ts";
import type {
  CreatePatientInput,
  UpdatePatientInput,
} from "../../../types/patient.d.ts";
import { Sex } from "../../../types/patient_enums.ts";
import { formatBirthDate } from "../../../graphql/scalars.ts";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await Patient.deleteMany({});
});

describe("PatientService", () => {
  it("should list only my patients", async () => {
    const user1 = await User.create({
      name: "User One",
      email: "user1@test.com",
    });
    const user2 = await User.create({
      name: "User Two",
      email: "user2@test.com",
    });

    await Patient.create({
      identifier: "P001",
      name: "John Doe",
      owner: user1._id,
      public: false,
    });
    await Patient.create({
      identifier: "P002",
      name: "Jane Smith",
      owner: user2._id,
      public: false,
    });

    const patients = await PatientService.listPatients(user1._id.toString());
    expect(patients.length).toBe(1);
    expect(patients[0].identifier).toBe("P001");
  });

  it("should get patient by ID only if it belongs to the owner", async () => {
    const user1 = await User.create({
      name: "User One",
      email: "user1@test.com",
    });

    const patient1 = await Patient.create({
      identifier: "P001",
      name: "John Doe",
      owner: user1._id,
      public: false,
    });

    const user2 = await User.create({
      name: "User Two",
      email: "user2@test.com",
    });

    const patient2 = await Patient.create({
      identifier: "P002",
      name: "John Doe",
      owner: user2._id,
      public: false,
    });

    const fetchedPatient = await PatientService.getPatient(
      patient1._id.toString(),
      user1._id.toString()
    );
    expect(fetchedPatient).not.toBeNull();
    expect(fetchedPatient?.identifier).toBe("P001");

    const fetchedPatientInvalid = await PatientService.getPatient(
      patient2._id.toString(),
      user1._id.toString()
    );
    expect(fetchedPatientInvalid).toBeNull();
  });

  it("should get patient by identifier or name (public only)", async () => {
    const user1 = await User.create({
      name: "User One",
      email: "user1@test.com",
    });

    await Patient.create({
      identifier: "P001",
      name: "John Doe",
      owner: user1._id,
      public: true,
    });
    await Patient.create({
      identifier: "P002",
      name: "Jane Smith",
      owner: user1._id,
      public: false,
    });

    const user2 = await User.create({
      name: "User Two",
      email: "user2@test.com",
    });

    await Patient.create({
      identifier: "P003",
      name: "John Smith",
      owner: user2._id,
      public: true,
    });

    const patientsByIdentifier = await PatientService.getPatientBy("P001", "");
    expect(patientsByIdentifier.length).toBe(1);
    expect(patientsByIdentifier[0].identifier).toBe("P001");

    const patientsByName = await PatientService.getPatientBy("", "John");
    expect(patientsByName.length).toBe(2);
    const names = patientsByName.map((p) => p.name);
    expect(names).toContain("John Doe");
    expect(names).toContain("John Smith");
  });

  it("should create a new patient", async () => {
    const user = await User.create({
      name: "User Test",
      email: "user@test.com",
    });

    const input: CreatePatientInput = {
      identifier: "P001",
      name: "John Doe",
      birthDate: formatBirthDate(new Date("1990-01-01")),
      sex: Sex.MALE,
      public: false,
      owner: user._id.toString(),
    };

    const patient = await PatientService.createPatient({ ...input });

    if (!patient) throw new Error("Patient creation failed");

    expect(patient).toBeDefined();
    expect(patient.identifier).toBe(input.identifier);
    expect(patient.name).toBe(input.name);
    expect(patient.birthDate!.toString()).toBe(input.birthDate);
    expect(patient.sex).toBe(input.sex);
    expect(patient.public).toBe(input.public);
    expect(patient.owner.toString()).toBe(user._id.toString());
  });

  it("should update a patient", async () => {
    const user = await User.create({
      name: "User One",
      email: "user1@test.com",
    });

    const patient = await Patient.create({
      identifier: "P001",
      name: "John Doe",
      owner: user._id,
      public: false,
    });

    const updateInput: UpdatePatientInput = {
      name: "John Updated",
      public: true,
    };

    const updatedPatient = await PatientService.updatePatient(
      patient._id.toString(),
      updateInput
    );

    expect(updatedPatient).toBeDefined();
    expect(updatedPatient?.name).toBe(updateInput.name);
    expect(updatedPatient?.public).toBe(updateInput.public);
  });

  it("should throw error when updating non-existing patient", async () => {
    const invalidId = new Types.ObjectId().toString();
    await expect(
      PatientService.updatePatient(invalidId, { name: "New Name" })
    ).rejects.toThrow("Patient not found");
  });

  it("should delete a patient", async () => {
    const user = await User.create({
      name: "User One",
      email: "user1@test.com",
    });

    const patient = await Patient.create({
      identifier: "P001",
      name: "John Doe",
      owner: user._id,
      public: false,
    });

    const deletedPatient = await PatientService.deletePatient(
      patient._id.toString()
    );

    expect(deletedPatient).toBeDefined();
    expect(deletedPatient?._id.toString()).toBe(patient._id.toString());

    const fetchDeleted = await Patient.findById(patient._id);
    expect(fetchDeleted).toBeNull();
  });
});
