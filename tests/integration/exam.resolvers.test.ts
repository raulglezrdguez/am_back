import jwt from "jsonwebtoken";
import request from "supertest";
import { Types } from "mongoose";

import { app } from "../../index.ts";
import User from "../../models/user.model.ts";
import Exam from "../../models/exam.model.ts";
import { closeTestDB, connectTestDB } from "./setup.ts";
import { JWT_SECRET } from "../../config/index.ts";

let server: any;

beforeAll(async () => {
  await connectTestDB();
  server = app.listen(0); // puerto aleatorio

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
});

const gql = (q: any) => ({ query: q });

describe("Exam GraphQL", () => {
  it("exams query", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
    });
    await Exam.create({
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
    await Exam.create({
      title: "Public Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      author: `${user._id}`,
      public: true,
      year: 2025,
      expression: [],
      questions: [],
    });
    const query = `{ exams { _id title public author { name email } } }`;
    const res = await request(server)
      .post("/graphql")
      .send(gql(query))
      .expect(200);
    const exams = res.body.data.exams;
    expect(exams).toHaveLength(1);
    expect(exams[0].title).toBe("Public Exam");
    expect(exams[0].author.name).toBe("Bob");
    expect(exams[0].author.email).toBe("bob@test.com");
  });

  it("exam Query", async () => {
    const bob = await User.create({
      name: "Bob",
      email: "bob@test.com",
      status: 1,
      role: 1,
    });
    const exam1 = await Exam.create({
      title: "Bob Private Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${bob._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });
    const ana = await User.create({
      name: "ana",
      email: "ana@test.com",
    });
    const exam2 = await Exam.create({
      title: "Ana Public Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      author: `${ana._id}`,
      public: true,
      year: 2025,
      expression: [],
      questions: [],
    });
    const exam3 = await Exam.create({
      title: "Ana Private Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${ana._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: bob._id, email: bob.email, status: 1, role: 1 },
      JWT_SECRET
    );

    let query = `{ exam(id: "${exam1._id.toString()}") { title author { email } } }`;
    let res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(query))
      .expect(200);
    expect(res.body.data.exam).toBeDefined();
    expect(res.body.data.exam.title).toBe(exam1.title);
    expect(res.body.data.exam.author.email).toBe(bob.email);

    query = `{ exam(id: "${exam1._id.toString()}") { title author { email } } }`;
    res = await request(server).post("/graphql").send(gql(query)).expect(200);
    expect(res.body.data.exam).toBeNull();

    query = `{ exam(id: "${exam2._id.toString()}") { title author { email } } }`;
    res = await request(server).post("/graphql").send(gql(query)).expect(200);
    expect(res.body.data.exam).toBeDefined();
    expect(res.body.data.exam.title).toBe(exam2.title);
    expect(res.body.data.exam.author.email).toBe(ana.email);

    query = `{ exam(id: "${exam2._id.toString()}") { title author { email } } }`;
    res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(query))
      .expect(200);
    expect(res.body.data.exam).toBeDefined();
    expect(res.body.data.exam.title).toBe(exam2.title);
    expect(res.body.data.exam.author.email).toBe(ana.email);

    query = `{ exam(id: "${exam3._id.toString()}") { title author { email } } }`;
    res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(query))
      .expect(200);
    expect(res.body.data.exam).toBeNull();
  });

  it("myExams query", async () => {
    const charlie = await User.create({
      name: "Charlie",
      email: "charlie@test.com",
      status: 1,
      role: 1,
    });
    await Exam.create({
      title: "Charlie's Exam 1",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${charlie._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });
    await Exam.create({
      title: "Charlie's Exam 2",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: true,
      author: `${charlie._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });
    const otherUser = await User.create({
      name: "Other",
      email: "other@test.com",
      status: 1,
      role: 1,
    });
    await Exam.create({
      title: "Other's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: true,
      author: `${otherUser._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: charlie._id, email: charlie.email, status: 1, role: 1 },
      JWT_SECRET
    );

    const query = `{ myExams { title author { email } } }`;
    let res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(query))
      .expect(200);
    const myExams = res.body.data.myExams;
    expect(myExams).toHaveLength(2);
    const titles = myExams.map((exam: any) => exam.title);
    expect(titles).toContain("Charlie's Exam 1");
    expect(titles).toContain("Charlie's Exam 2");
    myExams.forEach((exam: any) => {
      expect(exam.author.email).toBe(charlie.email);
    });

    res = await request(server).post("/graphql").send(gql(query)).expect(200);
    expect(res.body.data.myExams).toHaveLength(0);
  });

  it("createExam mutation", async () => {
    const eve = await User.create({
      name: "Eve",
      email: "eve@test.com",
      status: 1,
      role: 1,
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: eve._id, email: eve.email, status: 1, role: 1 },
      JWT_SECRET
    );

    const mutation = `
      mutation {
        createExam(input: { 
          title: "Eve's Exam",
          subtitle: "Subtitle",
          description: "Description",
          instructions: "Instructions",
          public: true,
          year: 2025,
          expression: [],
          questions: [],
        }) {
          title
          author {
            email
          }
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);
    const createdExam = res.body.data.createExam;
    expect(createdExam).toBeDefined();
    expect(createdExam.title).toBe("Eve's Exam");
    expect(createdExam.author.email).toBe(eve.email);
  });

  it("createExam mutation (without token) → returns error", async () => {
    const mutation = `
      mutation {
        createExam(input: {
          title: "Unauthorized Exam",
          subtitle: "Subtitle",
          description: "Description",
          instructions: "Instructions",
          public: true,
          year: 2025,
          expression: [],
          questions: [],
        }) {
          title
          author {
            email
          }
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .send(gql(mutation))
      .expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Authentication required");
  });

  it("createExam mutation (invalid token) → returns error", async () => {
    const mutation = `
      mutation {
        createExam(input: {
          title: "Invalid Token Exam",
          subtitle: "Subtitle",
          description: "Description",
          instructions: "Instructions",
          public: true,
          year: 2025,
          expression: [],
          questions: [],
        }) {
          title
          author {
            email
          }
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer invalid.token.here`)
      .send(gql(mutation))
      .expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Authentication required");
  });

  it("updateExamProperties mutation", async () => {
    const frank = await User.create({
      name: "Frank",
      email: "frank@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Frank's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${frank._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: frank._id, email: frank.email, status: 1, role: 1 },
      JWT_SECRET
    );

    const mutation = `
      mutation {
        updateExamProperties(id: "${exam._id.toString()}", input: {
          title: "Updated Frank's Exam",
          subtitle: "Updated Subtitle",
          description: "Updated Description",
          instructions: "Updated Instructions",
          public: true,
          year: 2026
        }) {
          title
          subtitle
          description
          instructions
          public
          year
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);
    const updatedExam = res.body.data.updateExamProperties;
    expect(updatedExam).toBeDefined();
    expect(updatedExam.title).toBe("Updated Frank's Exam");
    expect(updatedExam.subtitle).toBe("Updated Subtitle");
    expect(updatedExam.description).toBe("Updated Description");
    expect(updatedExam.instructions).toBe("Updated Instructions");
    expect(updatedExam.public).toBe(true);
    expect(updatedExam.year).toBe(2026);
  });

  it("updateExamProperties mutation (other author) → returns error", async () => {
    const george = await User.create({
      name: "George",
      email: "george@test.com",
      status: 1,
      role: 1,
    });
    const henry = await User.create({
      name: "Henry",
      email: "henry@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "George's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${george._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: henry._id, email: henry.email, status: 1, role: 1 },
      JWT_SECRET
    );

    const mutation = `
      mutation {
        updateExamProperties(id: "${exam._id.toString()}", input: {
          title: "Updated Frank's Exam",
        }) {
          title
        }
      }
    `;

    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Exam not found");
  });

  it("updateExamProperties mutation (without token) → returns error", async () => {
    const ivan = await User.create({
      name: "Ivan",
      email: "ivan@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Ivan's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${ivan._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });

    const mutation = `
      mutation {
        updateExamProperties(id: "${exam._id.toString()}", input: {
          title: "Updated Ivan's Exam",
        }) {
          title
        }
      }
    `;

    const res = await request(server)
      .post("/graphql")
      .send(gql(mutation))
      .expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Authentication required");
  });

  it("createExamExpression mutation", async () => {
    const jack = await User.create({
      name: "Jack",
      email: "jack@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Jack's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${jack._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: jack._id, email: jack.email, status: 1, role: 1 },
      JWT_SECRET
    );

    const mutation = `
      mutation {
        createExamExpression(id: "${exam._id.toString()}", input: [
          {
            id: "expr1",
            operator: EQ,
            value: "42",
            label: "The Answer",
            reference: "Hitchhiker's Guide",
            variable: "answer"
          }
        ]) {
          expression {
            id
            operator
            value
            label
            reference
            variable
          }
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);
    const updatedExam = res.body.data.createExamExpression;
    expect(updatedExam).toBeDefined();
    expect(updatedExam.expression).toHaveLength(1);
    expect(updatedExam.expression[0].id).toBe("expr1");
    expect(updatedExam.expression[0].operator).toBe("EQ");
    expect(updatedExam.expression[0].value).toBe("42");
    expect(updatedExam.expression[0].label).toBe("The Answer");
    expect(updatedExam.expression[0].reference).toBe("Hitchhiker's Guide");
    expect(updatedExam.expression[0].variable).toBe("answer");
  });

  it("createExamExpression mutation (other author) → returns error", async () => {
    const kevin = await User.create({
      name: "Kevin",
      email: "kevin@test.com",
      status: 1,
      role: 1,
    });
    const lucas = await User.create({
      name: "Lucas",
      email: "lucas@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Kevin's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${kevin._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: lucas._id, email: lucas.email, status: 1, role: 1 },
      JWT_SECRET
    );

    const mutation = `
      mutation {
        createExamExpression(id: "${exam._id.toString()}", input: [
          {
            id: "expr1",
            operator: EQ,
            value: "42",
            label: "The Answer",
            reference: "Hitchhiker's Guide",
            variable: "answer"
          }
        ]) {
          expression {
            id
          }
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Exam not found");
  });

  it("createExamExpression mutation (without token) → returns error", async () => {
    const mike = await User.create({
      name: "Mike",
      email: "mike@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Mike's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${mike._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });

    const mutation = `
      mutation {
        createExamExpression(id: "${exam._id.toString()}", input: [
          {
            id: "expr1",
            operator: EQ,
            value: "42",
            label: "The Answer",
            reference: "Hitchhiker's Guide",
            variable: "answer"
          }
        ]) {
          expression {
            id
          }
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .send(gql(mutation))
      .expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Authentication required");
  });

  it("updateExamExpression mutation", async () => {
    const nina = await User.create({
      name: "Nina",
      email: "nina@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Nina's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${nina._id}`,
      year: 2025,
      expression: [
        {
          id: "expr1",
          operator: "EQ",
          value: "42",
          label: "The Answer",
          reference: "Hitchhiker's Guide",
          variable: "answer",
        },
      ],
      questions: [],
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: nina._id, email: nina.email, status: 1, role: 1 },
      JWT_SECRET
    );

    const mutation = `
      mutation {
        updateExamExpression(id: "${exam._id.toString()}", input: {
          id: "expr1",
          operator: NE,
          value: "43",
          label: "Not The Answer",
          reference: "Some Other Book",
          variable: "not_answer"
        }) {
          expression {
            id
            operator
            value
            label
            reference
            variable
          }
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);
    const updatedExam = res.body.data.updateExamExpression;
    expect(updatedExam).toBeDefined();
    expect(updatedExam.expression).toHaveLength(1);
    expect(updatedExam.expression[0].id).toBe("expr1");
    expect(updatedExam.expression[0].operator).toBe("NE");
    expect(updatedExam.expression[0].value).toBe("43");
    expect(updatedExam.expression[0].label).toBe("Not The Answer");
    expect(updatedExam.expression[0].reference).toBe("Some Other Book");
    expect(updatedExam.expression[0].variable).toBe("not_answer");
  });

  it("updateExamExpression mutation (other author) → returns error", async () => {
    const oliver = await User.create({
      name: "Oliver",
      email: "oliver@test.com",
      status: 1,
      role: 1,
    });
    const paul = await User.create({
      name: "Paul",
      email: "paul@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Oliver's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${oliver._id}`,
      year: 2025,
      expression: [
        {
          id: "expr1",
          operator: "EQ",
          value: "42",
          label: "The Answer",
          reference: "Hitchhiker's Guide",
          variable: "answer",
        },
      ],
      questions: [],
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: paul._id, email: paul.email, status: 1, role: 1 },
      JWT_SECRET
    );

    const mutation = `
      mutation {
        updateExamExpression(id: "${exam._id.toString()}", input: {
          id: "expr1",
          operator: NE,
          value: "43",
          label: "Not The Answer",
          reference: "Some Other Book",
          variable: "not_answer"
        }) {
          expression {
            id
          }
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Exam not found");
  });

  it("updateExamExpression mutation (without token) → returns error", async () => {
    const quinn = await User.create({
      name: "Quinn",
      email: "quinn@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Quinn's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${quinn._id}`,
      year: 2025,
      expression: [
        {
          id: "expr1",
          operator: "EQ",
          value: "42",
          label: "The Answer",
          reference: "Hitchhiker's Guide",
          variable: "answer",
        },
      ],
      questions: [],
    });

    const mutation = `
      mutation {
        updateExamExpression(id: "${exam._id.toString()}", input: {
          id: "expr1",
          operator: NE,
          value: "43",
          label: "Not The Answer",
          reference: "Some Other Book",
          variable: "not_answer"
        }) {
          expression {
            id
          }
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .send(gql(mutation))
      .expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Authentication required");
  });

  it("createExamQuestion mutation", async () => {
    const jack = await User.create({
      name: "Jack",
      email: "jack@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Jack's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${jack._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: jack._id, email: jack.email, status: 1, role: 1 },
      JWT_SECRET
    );

    const mutation = `
      mutation {
        createExamQuestion(id: "${exam._id.toString()}", input: [
          {
            id: "quest1",
            text: "Text Question 1",
            expression: {
              id: "expr1",
              operator: EQ,
              value: "42",
              label: "The Answer",
              reference: "Hitchhiker's Guide",
              variable: "answer"
            },
            answer: RADIO,
            reference: "Some Reference",
            answers: [{
              id: "Answer 1",
              value: "42",
              content: "Forty Two"
            },{
              id: "Answer 2",
              value: "43",
              content: "Forty Three"
            }]
          }
        ]) {
          questions {
            id
            text
            expression {
              id
              operator
              value
              label
              reference
              variable
            }
            answer
            reference
            answers {
              id
              value
              content
            }
          }
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);
    const updatedExam = res.body.data.createExamQuestion;
    expect(updatedExam).toBeDefined();
    expect(updatedExam.questions).toHaveLength(1);
    expect(updatedExam.questions[0].id).toBe("quest1");
    expect(updatedExam.questions[0].text).toBe("Text Question 1");
    expect(updatedExam.questions[0].expression.id).toBe("expr1");
    expect(updatedExam.questions[0].expression.operator).toBe("EQ");
    expect(updatedExam.questions[0].expression.value).toBe("42");
    expect(updatedExam.questions[0].expression.label).toBe("The Answer");
    expect(updatedExam.questions[0].expression.reference).toBe(
      "Hitchhiker's Guide"
    );
    expect(updatedExam.questions[0].expression.variable).toBe("answer");
    expect(updatedExam.questions[0].answer).toBe("RADIO");
    expect(updatedExam.questions[0].reference).toBe("Some Reference");
    expect(updatedExam.questions[0].answers).toHaveLength(2);
    expect(updatedExam.questions[0].answers[0].id).toBe("Answer 1");
    expect(updatedExam.questions[0].answers[0].value).toBe("42");
    expect(updatedExam.questions[0].answers[0].content).toBe("Forty Two");
    expect(updatedExam.questions[0].answers[1].id).toBe("Answer 2");
    expect(updatedExam.questions[0].answers[1].value).toBe("43");
    expect(updatedExam.questions[0].answers[1].content).toBe("Forty Three");
  });

  it("createExamQuestion mutation (other author) → returns error", async () => {
    const kevin = await User.create({
      name: "Kevin",
      email: "kevin@test.com",
      status: 1,
      role: 1,
    });
    const lucas = await User.create({
      name: "Lucas",
      email: "lucas@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Kevin's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: true,
      author: `${kevin._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: lucas._id, email: lucas.email, status: 1, role: 1 },
      JWT_SECRET
    );

    const mutation = `
      mutation {
        createExamQuestion(id: "${exam._id.toString()}", input: [
          {
            id: "quest1",
            text: "Text Question 1",
            expression: {
              id: "expr1",
              operator: EQ,
              value: "42",
              label: "The Answer",
              reference: "Hitchhiker's Guide",
              variable: "answer"
            },
            answer: RADIO,
            reference: "Some Reference",
            answers: [{
              id: "Answer 1",
              value: "42",
              content: "Forty Two"
            },{
              id: "Answer 2",
              value: "43",
              content: "Forty Three"
            }]
          }
        ]) {
          questions {
            id
          }
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe(
      "Not authorized to create question to this exam"
    );
  });

  it("createExamQuestion mutation (without token) → returns error", async () => {
    const mike = await User.create({
      name: "Mike",
      email: "mike@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Mike's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${mike._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });

    const mutation = `
      mutation {
        createExamQuestion(id: "${exam._id.toString()}", input: [
          {
            id: "quest1",
            text: "Text Question 1",
            expression: {
              id: "expr1",
              operator: EQ,
              value: "42",
              label: "The Answer",
              reference: "Hitchhiker's Guide",
              variable: "answer"
            },
            answer: RADIO,
            reference: "Some Reference",
            answers: [{
              id: "Answer 1",
              value: "42",
              content: "Forty Two"
            }]
          }
        ]) {
          questions {
            id
          }
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .send(gql(mutation))
      .expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Authentication required");
  });

  it("updateExamQuestion mutation", async () => {
    const nina = await User.create({
      name: "Nina",
      email: "nina@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Nina's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${nina._id}`,
      year: 2025,
      expression: [],
      questions: [
        {
          id: "quest1",
          text: "Text Question 1",
          expression: {
            id: "expr1",
            operator: "EQ",
            value: "42",
            label: "The Answer",
            reference: "Hitchhiker's Guide",
            variable: "answer",
          },
          answer: "RADIO",
          reference: "Some Reference",
          answers: [
            {
              id: "Answer 1",
              value: "42",
              content: "Forty Two",
            },
          ],
        },
      ],
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: nina._id, email: nina.email, status: 1, role: 1 },
      JWT_SECRET
    );

    const mutation = `
      mutation {
        updateExamQuestion(id: "${exam._id.toString()}", input: {
          id: "quest1",
          text: "Updated Text Question 1",
          expression: {
            id: "expr1",
            operator: NE,
            value: "43",
            label: "Not The Answer",
            reference: "Some Other Book",
            variable: "not_answer"
          },
          answer: TEXT,
          reference: "Updated Reference",
          answers: [{
            id: "Answer 1",
            value: "44",
            content: "Forty Four"
          }]
        }) {
          questions {
            id
            text
            expression {
              id
              operator
              value
              label
              reference
              variable
            }
            answer
            reference
            answers {
              id
              value
              content
            }
          }
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);
    const updatedExam = res.body.data.updateExamQuestion;
    expect(updatedExam).toBeDefined();
    expect(updatedExam.questions).toHaveLength(1);
    expect(updatedExam.questions[0].id).toBe("quest1");
    expect(updatedExam.questions[0].text).toBe("Updated Text Question 1");
    expect(updatedExam.questions[0].expression.id).toBe("expr1");
    expect(updatedExam.questions[0].expression.operator).toBe("NE");
    expect(updatedExam.questions[0].expression.value).toBe("43");
    expect(updatedExam.questions[0].expression.label).toBe("Not The Answer");
    expect(updatedExam.questions[0].expression.reference).toBe(
      "Some Other Book"
    );
    expect(updatedExam.questions[0].expression.variable).toBe("not_answer");
    expect(updatedExam.questions[0].answer).toBe("TEXT");
    expect(updatedExam.questions[0].reference).toBe("Updated Reference");
    expect(updatedExam.questions[0].answers).toHaveLength(1);
    expect(updatedExam.questions[0].answers[0].id).toBe("Answer 1");
    expect(updatedExam.questions[0].answers[0].value).toBe("44");
    expect(updatedExam.questions[0].answers[0].content).toBe("Forty Four");
  });

  it("updateExamQuestion mutation (other author) → returns error", async () => {
    const oliver = await User.create({
      name: "Oliver",
      email: "oliver@test.com",
      status: 1,
      role: 1,
    });
    const paul = await User.create({
      name: "Paul",
      email: "paul@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Oliver's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: true,
      author: `${oliver._id}`,
      year: 2025,
      expression: [],
      questions: [
        {
          id: "quest1",
          text: "Text Question 1",
          expression: {
            id: "expr1",
            operator: "EQ",
            value: "42",
            label: "The Answer",
            reference: "Hitchhiker's Guide",
            variable: "answer",
          },
          answer: "RADIO",
          reference: "Some Reference",
          answers: [
            {
              id: "Answer 1",
              value: "42",
              content: "Forty Two",
            },
          ],
        },
      ],
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: paul._id, email: paul.email, status: 1, role: 1 },
      JWT_SECRET
    );

    const mutation = `
      mutation {
        updateExamQuestion(id: "${exam._id.toString()}", input: {
          id: "quest1",
          text: "Updated Text Question 1"
          expression: {
            id: "expr1",
            operator: NE,
            value: "43",
            label: "Not The Answer",
            reference: "Some Other Book",
            variable: "not_answer"
          },
          answer: TEXT,
          reference: "Updated Reference",
          answers: [{
            id: "Answer 1",
            value: "44",
            content: "Forty Four"
          }]
        }) {
          questions {
            id
          }
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe(
      "Not authorized to update question to this exam"
    );
  });

  it("updateExamQuestion mutation (without token) → returns error", async () => {
    const quinn = await User.create({
      name: "Quinn",
      email: "quinn@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Quinn's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${quinn._id}`,
      year: 2025,
      expression: [],
      questions: [
        {
          id: "quest1",
          text: "Text Question 1",
          expression: {
            id: "expr1",
            operator: "EQ",
            value: "42",
            label: "The Answer",
            reference: "Hitchhiker's Guide",
            variable: "answer",
          },
          answer: "RADIO",
          reference: "Some Reference",
          answers: [
            {
              id: "Answer 1",
              value: "42",
              content: "Forty Two",
            },
          ],
        },
      ],
    });

    const mutation = `
      mutation {
        updateExamQuestion(id: "${exam._id.toString()}", input: {
          id: "quest1",
          text: "Updated Text Question 1"
          expression: {
            id: "expr1",
            operator: NE,
            value: "43",
            label: "Not The Answer",
            reference: "Some Other Book",
            variable: "not_answer"
          },
          answer: TEXT,
          reference: "Updated Reference",
          answers: [{
            id: "Answer 1",
            value: "44",
            content: "Forty Four"
          }]
        }) {
          questions {
            id
          }
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .send(gql(mutation))
      .expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Authentication required");
  });

  it("deleteExamQuestion mutation", async () => {
    const ryan = await User.create({
      name: "Ryan",
      email: "ryan@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Ryan's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${ryan._id}`,
      year: 2025,
      expression: [],
      questions: [
        {
          id: "quest1",
          text: "Text Question 1",
          expression: {
            id: "expr1",
            operator: "EQ",
            value: "42",
            label: "The Answer",
            reference: "Hitchhiker's Guide",
            variable: "answer",
          },
          answer: "RADIO",
          reference: "Some Reference",
          answers: [
            {
              id: "Answer 1",
              value: "42",
              content: "Forty Two",
            },
          ],
        },
      ],
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: ryan._id, email: ryan.email, status: 1, role: 1 },
      JWT_SECRET
    );

    const mutation = `
      mutation {
        deleteExamQuestion(id: "${exam._id.toString()}", questionId: "quest1") {
          questions {
            id
          }
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);
    const updatedExam = res.body.data.deleteExamQuestion;
    expect(updatedExam).toBeDefined();
    expect(updatedExam.questions).toHaveLength(0);
  });

  it("deleteExamQuestion mutation (other author) → returns error", async () => {
    const steve = await User.create({
      name: "Steve",
      email: "steve@test.com",
      status: 1,
      role: 1,
    });
    const tom = await User.create({
      name: "Tom",
      email: "tom@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Steve's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: true,
      author: `${steve._id}`,
      year: 2025,
      expression: [],
      questions: [
        {
          id: "quest1",
          text: "Text Question 1",
          expression: {
            id: "expr1",
            operator: "EQ",
            value: "42",
            label: "The Answer",
            reference: "Hitchhiker's Guide",
            variable: "answer",
          },
          answer: "RADIO",
          reference: "Some Reference",
          answers: [
            {
              id: "Answer 1",
              value: "42",
              content: "Forty Two",
            },
          ],
        },
      ],
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: tom._id, email: tom.email, status: 1, role: 1 },
      JWT_SECRET
    );

    const mutation = `
      mutation {
        deleteExamQuestion(id: "${exam._id.toString()}", questionId: "quest1") {
          questions {
            id
          }
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe(
      "Not authorized to delete question from this exam"
    );
  });

  it("deleteExamQuestion mutation (without token) → returns error", async () => {
    const ursula = await User.create({
      name: "Ursula",
      email: "ursula@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Ursula's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${ursula._id}`,
      year: 2025,
      expression: [],
      questions: [
        {
          id: "quest1",
          text: "Text Question 1",
          expression: {
            id: "expr1",
            operator: "EQ",
            value: "42",
            label: "The Answer",
            reference: "Hitchhiker's Guide",
            variable: "answer",
          },
          answer: "RADIO",
          reference: "Some Reference",
          answers: [
            {
              id: "Answer 1",
              value: "42",
              content: "Forty Two",
            },
          ],
        },
      ],
    });

    const mutation = `
      mutation {
        deleteExamQuestion(id: "${exam._id.toString()}", questionId: "quest1") {
          questions {
            id
          }
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .send(gql(mutation))
      .expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Authentication required");
  });

  it("deleteExam mutation", async () => {
    const victor = await User.create({
      name: "Victor",
      email: "victor@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Victor's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${victor._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: victor._id, email: victor.email, status: 1, role: 1 },
      JWT_SECRET
    );

    const mutation = `
      mutation {
        deleteExam(id: "${exam._id.toString()}") {
          title
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);
    const deletedExam = res.body.data.deleteExam;
    expect(deletedExam).toBeDefined();
    expect(deletedExam.title).toBe("Victor's Exam");

    const foundExam = await Exam.findById(exam._id);
    expect(foundExam).toBeNull();
  });

  it("deleteExam mutation (other author) → returns error", async () => {
    const walt = await User.create({
      name: "Walt",
      email: "walt@test.com",
      status: 1,
      role: 1,
    });
    const xander = await User.create({
      name: "Xander",
      email: "xander@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Walt's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: true,
      author: `${walt._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: xander._id, email: xander.email, status: 1, role: 1 },
      JWT_SECRET
    );

    const mutation = `
      mutation {
        deleteExam(id: "${exam._id.toString()}") {
          title
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe(
      "Not authorized to delete this exam"
    );
  });

  it("deleteExam mutation (without token) → returns error", async () => {
    const yvonne = await User.create({
      name: "Yvonne",
      email: "yvonne@test.com",
      status: 1,
      role: 1,
    });
    const exam = await Exam.create({
      title: "Yvonne's Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${yvonne._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });

    const mutation = `
      mutation {
        deleteExam(id: "${exam._id.toString()}") {
          title
        }
      }
    `;
    const res = await request(server)
      .post("/graphql")
      .send(gql(mutation))
      .expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Authentication required");
  });
});
