import jwt from "jsonwebtoken";
import request from "supertest";

import { app } from "../../index.ts";
import User from "../../models/user.model.ts";
import Patient from "../../models/patient.model.ts";
import Exam from "../../models/exam.model.ts";
import Stat from "../../models/stat.model.ts";
import { closeTestDB, connectTestDB } from "./setup.ts";
import { JWT_SECRET } from "../../config/index.ts";
import { formatBirthDate } from "../../graphql/scalars.ts";

let server: any;

beforeAll(async () => {
  await connectTestDB();
  server = app.listen(0);

  await new Promise((resolve) => server.once("listening", resolve));
});

afterAll(async () => {
  (global as any).__TEST_TEAR_DOWN__ = true;

  await closeTestDB();

  await new Promise((resolve) => server.close(resolve));

  const admin = await import("firebase-admin");
  const apps = admin.apps;
  for (let i = 0; i < apps?.length; i++) {
    await apps[i]?.delete();
  }
});

afterEach(async () => {
  await User.deleteMany({});
  await Exam.deleteMany({});
  await Patient.deleteMany({});
  await Stat.deleteMany({});
});

const gql = (q: any) => ({ query: q });

describe("Stat graphql", () => {
  it("getStatById query", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
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
      identifier: "P123",
      name: "Alice",
      owner: `${user._id}`,
      public: false,
    });
    const stat = await Stat.create({
      exam: `${exam._id}`,
      patient: `${patient._id}`,
      author: `${user._id}`,
      completedAt: new Date(),
      result: { value: "A", text: "All good" },
      answers: [{ id: "Q1", answer: "Yes" }],
    });

    if (!JWT_SECRET)
      throw new Error("JWT_SECRET is not defined in environment variables");
    const token = jwt.sign(
      { id: user._id, email: user.email, status: 1, role: 1 },
      JWT_SECRET
    );

    let query = `{
        getStatById(id: "${stat._id.toString()}") {
            _id
            result {
                value
                text
            }
            answers {
                id
                answer
            }
            author {
                email
            }
            exam {
                _id
            }
            patient {
                identifier
            }
            address
            completedAt
        }
    }`;

    let res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(query))
      .expect(200);

    const statById = res.body.data.getStatById;

    expect(statById._id).toBe(stat._id.toString());
    expect(statById.result.value).toBe(stat.result?.value);
    expect(statById.result.text).toBe(stat.result?.text);
    expect(statById.answers.length).toBe(1);
    expect(statById.answers[0].id).toBe(stat.answers[0].id);
    expect(statById.answers[0].answer).toBe(stat.answers[0].answer);
  });

  it("getStatByPatient query", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
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
      identifier: "P123",
      name: "Alice",
      owner: `${user._id}`,
      public: false,
    });
    const stat = await Stat.create({
      exam: `${exam._id}`,
      patient: `${patient._id}`,
      author: `${user._id}`,
      completedAt: new Date(),
      result: { value: "A", text: "All good" },
      answers: [{ id: "Q1", answer: "Yes" }],
    });

    if (!JWT_SECRET)
      throw new Error("JWT_SECRET is not defined in environment variables");
    const token = jwt.sign(
      { id: user._id, email: user.email, status: 1, role: 1 },
      JWT_SECRET
    );

    let query = `{
        getStatsByPatient(id: "${patient._id.toString()}") {
            _id
            result {
                value
                text
            }
            answers {
                id
                answer
            }
            author {
                email
            }
            exam {
                _id
            }
            patient {
                identifier
            }
            address
            completedAt
        }
    }`;

    let res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(query))
      .expect(200);

    const statsByPatient = res.body.data.getStatsByPatient;

    expect(statsByPatient.length).toBe(1);

    expect(statsByPatient[0]._id).toBe(stat._id.toString());
    expect(statsByPatient[0].result.value).toBe(stat.result?.value);
    expect(statsByPatient[0].result.text).toBe(stat.result?.text);
    expect(statsByPatient[0].answers.length).toBe(1);
    expect(statsByPatient[0].answers[0].id).toBe(stat.answers[0].id);
    expect(statsByPatient[0].answers[0].answer).toBe(stat.answers[0].answer);
  });

  it("getStatByExam query", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
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
      identifier: "P123",
      name: "Alice",
      owner: `${user._id}`,
      public: false,
    });
    const stat = await Stat.create({
      exam: `${exam._id}`,
      patient: `${patient._id}`,
      author: `${user._id}`,
      completedAt: new Date(),
      result: { value: "A", text: "All good" },
      answers: [{ id: "Q1", answer: "Yes" }],
    });

    if (!JWT_SECRET)
      throw new Error("JWT_SECRET is not defined in environment variables");
    const token = jwt.sign(
      { id: user._id, email: user.email, status: 1, role: 1 },
      JWT_SECRET
    );

    let query = `{
        getStatsByExam(id: "${exam._id.toString()}") {
            _id
            result {
                value
                text
            }
            answers {
                id
                answer
            }
            author {
                email
            }
            exam {
                _id
            }
            patient {
                identifier
            }
            address
            completedAt
        }
    }`;

    let res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(query))
      .expect(200);

    const statsByExam = res.body.data.getStatsByExam;

    expect(statsByExam.length).toBe(1);

    expect(statsByExam[0]._id).toBe(stat._id.toString());
    expect(statsByExam[0].result.value).toBe(stat.result?.value);
    expect(statsByExam[0].result.text).toBe(stat.result?.text);
    expect(statsByExam[0].answers.length).toBe(1);
    expect(statsByExam[0].answers[0].id).toBe(stat.answers[0].id);
    expect(statsByExam[0].answers[0].answer).toBe(stat.answers[0].answer);
  });

  it("getStats query", async () => {
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
    await Stat.create({
      exam: exam._id.toString(),
      patient: patient._id.toString(),
      author: user._id.toString(),
      completedAt: new Date("2024-02-01"),
      result: { value: "B", text: "text2" },
      answers: [{ id: "id2", answer: "answer2" }],
      address: "Address 2",
    });

    let query = `{
        getStats(filter: {examId: "${exam._id.toString()}", completedAt: "${new Date(
      "2024-03-01"
    )}", address: "Address", resultValue: "A"}) {
            result {
                value
                text
            }
            answers {
                id
                answer
            }
            author {
                email
            }
            exam {
                _id
            }
            address
            completedAt
        }
    }`;

    let res = await request(server)
      .post("/graphql")
      .send(gql(query))
      .expect(200);

    const getStats = res.body.data.getStats;

    expect(getStats.length).toBe(1);
    expect(getStats[0].result.value).toBe(stat1.result?.value);
    expect(getStats[0].result.text).toBe(stat1.result?.text);
    expect(getStats[0].answers.length).toBe(1);
    expect(getStats[0].author.email).toBe(user.email);
    expect(getStats[0].exam._id.toString()).toBe(exam._id.toString());
    expect(getStats[0].address).toBe(stat1.address);
    expect(new Date(getStats[0].completedAt).toISOString()).toBe(
      new Date(stat1.completedAt).toISOString()
    );
  });

  it("createStat mutation", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
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
      identifier: "P123",
      name: "Alice",
      owner: `${user._id}`,
      public: false,
    });

    if (!JWT_SECRET)
      throw new Error("JWT_SECRET is not defined in environment variables");
    const token = jwt.sign(
      { id: user._id, email: user.email, status: 1, role: 1 },
      JWT_SECRET
    );

    const mutation = `
          mutation {
            createStat(input: {
              examId: "${exam._id.toString()}",
              patientId: "${patient._id.toString()}",
              completedAt: "${new Date("2024-01-01")}",
              result: {value: "A", text: "B"},
              answers: [{id: "C", answer: "D"}],
              address: "Address A"
            }) {
              result {
                  value
                  text
              }
              answers {
                  id
                  answer
              }
              author {
                  email
              }
              exam {
                  _id
              }
              address
              completedAt
            }
          }
        `;

    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);

    const createStat = res.body.data.createStat;

    expect(createStat).toBeDefined();
    expect(createStat.result.value).toBe("A");
    expect(createStat.result.text).toBe("B");
    expect(createStat.answers.length).toBe(1);
    expect(createStat.answers[0].id).toBe("C");
    expect(createStat.answers[0].answer).toBe("D");
    expect(createStat.author.email).toBe(user.email);
    expect(createStat.exam._id.toString()).toBe(exam._id.toString());
    expect(createStat.address).toBe("Address A");
    expect(new Date(createStat.completedAt).toISOString()).toBe(
      new Date("2024-01-01").toISOString()
    );
  });
});
