import { closeTestDB, connectTestDB } from "./setup.ts";
import Exam from "../../../models/exam.model.ts";
import User from "../../../models/user.model.ts";
import Patient from "../../../models/patient.model.ts";
import Stat from "../../../models/stat.model.ts";

import * as statService from "../../../services/stat.service.ts";
import { Sex } from "../../../types/patient_enums.ts";
import { formatBirthDate } from "../../../graphql/scalars.ts";
import { CreateStatInput } from "../../../types/stat.js";
import type { StatActor } from "../../../services/stat.policy.ts";

const actorOf = (user: { _id: any; role?: number }): StatActor => ({
  id: user._id.toString(),
  role: user.role ?? 1,
});

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await User.deleteMany({});
  await Exam.deleteMany({});
  await Patient.deleteMany({});
  await Stat.deleteMany({});
});

describe("Stat service", () => {
  describe("Queries", () => {
    it("should get stat by id", async () => {
      const user = await User.create({
        name: "Bob",
        email: "bob@test.com",
        password: "5678",
        role: 1,
        status: 1,
      });
      const exam = await Exam.create({
        title: "Private Exam",
        subtitle: "Subtitle",
        description: "Description",
        instructions: "Instructions",
        public: false,
        author: `${user._id}`,
        year: 2025,
        expression: [],
        questions: [],
      });
      const exam1 = await Exam.create({
        title: "Public Exam",
        subtitle: "Subtitle",
        description: "Description",
        instructions: "Instructions",
        public: true,
        author: `${user._id}`,
        year: 2025,
        expression: [],
        questions: [],
      });
      const patient = await Patient.create({
        identifier: "P001",
        name: "John Doe",
        birthDate: formatBirthDate(new Date("1990-01-01")),
        sex: Sex.MALE,
        public: false,
        owner: user._id.toString(),
      });
      const stat = await Stat.create({
        exam: exam._id.toString(),
        patient: patient._id.toString(),
        author: user._id.toString(),
        completedAt: new Date(),
        result: { value: "value", text: "text" },
        answers: [{ id: "id", answer: "answer" }],
      });

      const statById = await statService.getStatById(
        stat._id.toString(),
        actorOf(user),
      );
      expect(statById).toBeDefined();
      expect(statById?.exam._id.toString()).toBe(exam._id.toString());
      expect(statById?.patient._id.toString()).toBe(patient._id.toString());
      expect(statById?.author._id.toString()).toBe(user._id.toString());
      expect(statById?.result?.text).toBe("text");
      expect(statById?.result?.value).toBe("value");
      expect(statById?.answers[0].id).toBe("id");
      expect(statById?.answers[0].answer).toBe("answer");
    });

    it("should get stats by patient", async () => {
      const user = await User.create({
        name: "Bob",
        email: "bob@test.com",
        password: "5678",
        role: 1,
        status: 1,
      });
      const exam = await Exam.create({
        title: "Private Exam",
        subtitle: "Subtitle",
        description: "Description",
        instructions: "Instructions",
        public: false,
        author: `${user._id}`,
        year: 2025,
        expression: [],
        questions: [],
      });
      const patient = await Patient.create({
        identifier: "P001",
        name: "John Doe",
        birthDate: formatBirthDate(new Date("1990-01-01")),
        sex: Sex.MALE,
        public: false,
        owner: user._id.toString(),
      });
      const patient1 = await Patient.create({
        identifier: "P002",
        name: "John Smith",
        birthDate: formatBirthDate(new Date("1990-01-01")),
        sex: Sex.MALE,
        public: false,
        owner: user._id.toString(),
      });
      await Stat.create({
        exam: exam._id.toString(),
        patient: patient._id.toString(),
        author: user._id.toString(),
        completedAt: new Date(),
        result: { value: "value1", text: "text1" },
        answers: [{ id: "id1", answer: "answer1" }],
      });
      await Stat.create({
        exam: exam._id.toString(),
        patient: patient._id.toString(),
        author: user._id.toString(),
        completedAt: new Date(),
        result: { value: "value2", text: "text2" },
        answers: [{ id: "id2", answer: "answer2" }],
      });
      await Stat.create({
        exam: exam._id.toString(),
        patient: patient1._id.toString(),
        author: user._id.toString(),
        completedAt: new Date(),
        result: { value: "value2", text: "text2" },
        answers: [{ id: "id2", answer: "answer2" }],
      });

      const page = await statService.getStatsByPatient(
        patient._id.toString(),
        actorOf(user),
      );
      expect(page.items).toHaveLength(2);
      expect(page).toBeDefined();
      // El orden por completedAt/_id puede empatar: no usar índices fijos
      const text2Stat = page.items.find((s: any) => s.result?.text === "text2");
      expect(text2Stat).toBeDefined();
      expect(text2Stat?.answers[0].id).toBe("id2");

      // expect(text2Stat?.exam._id.toString()).toBe(exam._id.toString());
      // expect(text2Stat?.patient._id.toString()).toBe(patient._id.toString());
      // expect(text2Stat?.author._id.toString()).toBe(user._id.toString());
      // expect(text2Stat?.result?.text).toBe("text2");
      // expect(text2Stat?.result?.value).toBe("value2");
      // expect(text2Stat?.answers[0].id).toBe("id2");
      // expect(text2Stat?.answers[0].answer).toBe("answer2");
    });

    it("should get stats by exam", async () => {
      const user = await User.create({
        name: "Bob",
        email: "bob@test.com",
        password: "5678",
        role: 1,
        status: 1,
      });
      const exam1 = await Exam.create({
        title: "Private Exam",
        subtitle: "Subtitle",
        description: "Description",
        instructions: "Instructions",
        public: false,
        author: `${user._id}`,
        year: 2025,
        expression: [],
        questions: [],
      });
      const exam2 = await Exam.create({
        title: "Public Exam",
        subtitle: "Subtitle",
        description: "Description",
        instructions: "Instructions",
        public: true,
        author: `${user._id}`,
        year: 2025,
        expression: [],
        questions: [],
      });
      const patient = await Patient.create({
        identifier: "P001",
        name: "John Doe",
        birthDate: formatBirthDate(new Date("1990-01-01")),
        sex: Sex.MALE,
        public: false,
        owner: user._id.toString(),
      });
      await Stat.create({
        exam: exam1._id.toString(),
        patient: patient._id.toString(),
        author: user._id.toString(),
        completedAt: new Date(),
        result: { value: "value1", text: "text1" },
        answers: [{ id: "id1", answer: "answer1" }],
      });
      await Stat.create({
        exam: exam2._id.toString(),
        patient: patient._id.toString(),
        author: user._id.toString(),
        completedAt: new Date(),
        result: { value: "value2", text: "text2" },
        answers: [{ id: "id2", answer: "answer2" }],
      });

      const examPage = await statService.getStatsByExam(
        exam1._id.toString(),
        actorOf(user),
      );
      expect(examPage.items).toHaveLength(1);
      const firstStat = examPage.items[0];
      expect(firstStat?.result?.text).toBe("text1");

      // expect(firstStat?.exam._id.toString()).toBe(exam1._id.toString());
      // expect(firstStat?.patient._id.toString()).toBe(patient._id.toString());
      // expect(firstStat?.author._id.toString()).toBe(user._id.toString());
      // expect(firstStat?.result?.text).toBe("text1");
      // expect(firstStat?.result?.value).toBe("value1");
      // expect(firstStat?.answers[0].id).toBe("id1");
      // expect(firstStat?.answers[0].answer).toBe("answer1");
    });

    it("should get stats by filter", async () => {
      const user = await User.create({
        name: "Bob",
        email: "bob@test.com",
        password: "5678",
        role: 1,
        status: 1,
      });
      const exam = await Exam.create({
        title: "Private Exam",
        subtitle: "Subtitle",
        description: "Description",
        instructions: "Instructions",
        public: false,
        author: `${user._id}`,
        year: 2025,
        expression: [],
        questions: [],
      });
      const patient = await Patient.create({
        identifier: "P001",
        name: "John Doe",
        birthDate: formatBirthDate(new Date("1990-01-01")),
        owner: user._id.toString(),
        public: false,
      });
      const stat1 = await Stat.create({
        exam: exam._id.toString(),
        patient: patient._id.toString(),
        author: user._id.toString(),
        completedAt: new Date("2024-01-01"),
        result: { value: "A", text: "text1" },
        answers: [{ id: "id1", answer: "answer1" }],
        address: "Address 1",
      });
      const stat2 = await Stat.create({
        exam: exam._id.toString(),
        patient: patient._id.toString(),
        author: user._id.toString(),
        completedAt: new Date("2024-02-01"),
        result: { value: "B", text: "text2" },
        answers: [{ id: "id2", answer: "answer2" }],
        address: "Address 2",
      });

      const filterPage = await statService.getStats(
        {
          examId: exam._id.toString(),
          resultValue: stat1.result?.value,
          address: stat1.address || "",
          completedAt: stat1.completedAt.toISOString(),
        },
        { actor: actorOf(user), limit: 50 },
      );
      expect(filterPage.items).toHaveLength(1);
      const filtered = filterPage.items[0];
      expect(filtered?.result?.text).toBe(stat1.result?.text);

      // expect(filtered?.exam._id.toString()).toBe(exam._id.toString());
      // expect(filtered?.patient._id.toString()).toBe(patient._id.toString());
      // expect(filtered?.author._id.toString()).toBe(user._id.toString());
      // expect(filtered?.result?.text).toBe(stat1.result?.text);
      // expect(filtered?.result?.value).toBe(stat1.result?.value);
      // expect(filtered?.answers[0].id).toBe(stat1.answers[0].id);
      // expect(filtered?.answers[0].answer).toBe(stat1.answers[0].answer);
      // expect(filtered?.address).toBe(stat1.address);
    });
  });

  describe("Mutations", () => {
    it("should create a new stat", async () => {
      const user = await User.create({
        name: "Bob",
        email: "bob@test.com",
        password: "5678",
        role: 1,
        status: 1,
      });
      const exam = await Exam.create({
        title: "Private Exam",
        subtitle: "Subtitle",
        description: "Description",
        instructions: "Instructions",
        public: false,
        author: `${user._id}`,
        year: 2025,
        expression: [],
        questions: [],
      });
      const patient = await Patient.create({
        identifier: "P001",
        name: "John Doe",
        birthDate: formatBirthDate(new Date("1990-01-01")),
        owner: user._id.toString(),
        public: false,
      });

      const statInput: CreateStatInput = {
        examId: exam._id.toString(),
        patientId: patient._id.toString(),
        authorId: user._id.toString(),
        completedAt: new Date().toISOString(),
        result: { value: "C", text: "textC" },
        answers: [{ id: "idC", answer: "answerC" }],
        address: "Address C",
      };

      const newStat = await statService.createStat(statInput, actorOf(user));

      expect(newStat).toBeDefined();
      expect(newStat?.exam._id.toString()).toBe(exam._id.toString());
      expect(newStat?.patient._id.toString()).toBe(patient._id.toString());
      expect(newStat?.author._id.toString()).toBe(user._id.toString());
      expect(newStat?.result?.text).toBe(statInput.result.text);
      expect(newStat?.result?.value).toBe(statInput.result.value);
      expect(newStat?.answers[0].id).toBe(statInput.answers[0].id);
      expect(newStat?.answers[0].answer).toBe(statInput.answers[0].answer);
      expect(newStat?.address).toBe(statInput.address);
    });
  });
});
