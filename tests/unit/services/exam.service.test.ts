import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Exam from "../../../models/exam.model.ts";
import User from "../../../models/user.model.ts";
import * as examService from "../../../services/exam.service.ts";
import type {
  CreateExamInput,
  AnswerOptionInput,
  ExpressionInput,
  QuestionInput,
  UpdateExamPropertiesInput,
} from "../../../types/exam.d.ts";
import { Answer, Operator } from "../../../types/exam_enums.ts";

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
  await Exam.deleteMany({});
});

describe("ExamServise", () => {
  it("should list only public exams", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
      role: 1,
      status: 1,
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

    const otherUser = await User.create({
      name: "Ana",
      email: "ana@test.com",
      password: "5678",
      role: 1,
      status: 1,
    });
    await Exam.create({
      title: "Private Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${otherUser._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });

    const exams = await examService.listExams();
    expect(exams.length).toBe(1);
  });

  it("should list exams by author", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
      role: 1,
      status: 1,
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
    const otherUser = await User.create({
      name: "Any",
      email: "any@test.com",
      password: "5678",
      role: 1,
      status: 1,
    });
    await Exam.create({
      title: "Private Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: false,
      author: `${otherUser._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });

    const exams = await examService.listExamsByAuthor(`${user._id}`);
    expect(exams.length).toBe(2);
  });

  it("should get exam by id if public or belongs to author", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
      role: 1,
      status: 1,
    });
    const userExam1 = await Exam.create({
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
    const userExam2 = await Exam.create({
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
    const otherUser = await User.create({
      name: "Any",
      email: "any@test.com",
      password: "5678",
      role: 1,
      status: 1,
    });
    const otherUserExam = await Exam.create({
      title: "Other Public Exam",
      subtitle: "Subtitle",
      description: "Description",
      instructions: "Instructions",
      public: true,
      author: `${otherUser._id}`,
      year: 2025,
      expression: [],
      questions: [],
    });

    // Accessing public exam
    const publicExam = await examService.getExamById(`${userExam2._id}`, null);
    expect(publicExam).not.toBeNull();
    expect(publicExam?.title).toBe("Public Exam");
    expect(publicExam?.author).toBeDefined();
    expect(publicExam?.author._id.toString()).toBe(user._id.toString());

    // Accessing user's private exam
    const privateExamAsAuthor = await examService.getExamById(
      `${userExam1._id}`,
      `${user._id}`
    );
    expect(privateExamAsAuthor).not.toBeNull();
    expect(privateExamAsAuthor?.title).toBe("Private Exam");
    expect(privateExamAsAuthor?.author).toBeDefined();
    expect(privateExamAsAuthor?.author._id.toString()).toBe(
      user._id.toString()
    );

    // Accessing other user's private exam
    const otherUserPrivateExam = await examService.getExamById(
      `${userExam1._id}`,
      `${otherUser._id}`
    );
    expect(otherUserPrivateExam).toBeNull();

    // Accessing other user's private exam
    const otherPrivateExam = await examService.getExamById(
      `${userExam1._id}`,
      null
    );
    expect(otherPrivateExam).toBeNull();

    // Accessing other user's public exam
    const otherPublicExam = await examService.getExamById(
      `${otherUserExam._id}`,
      null
    );
    expect(otherPublicExam).not.toBeNull();
    expect(otherPublicExam?.title).toBe("Other Public Exam");
    expect(otherPublicExam?.author).toBeDefined();
    expect(otherPublicExam?.author._id.toString()).toBe(
      otherUser._id.toString()
    );
  });

  it("should create an exam", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
      role: 1,
      status: 1,
    });
    const input: CreateExamInput = {
      title: "Exam title",
      subtitle: "Exam subtitle",
      description: "Exam description",
      instructions: "Exam instructions",
      author: `${user._id}`,
      public: true,
      year: 2025,
      expression: [],
      questions: [],
    };

    const exam = await examService.createExam(input);
    expect(exam).toMatchObject({
      title: "Exam title",
      subtitle: "Exam subtitle",
      description: "Exam description",
      instructions: "Exam instructions",
      public: true,
      year: 2025,
      expression: [],
      questions: [],
    });
    expect(exam.author).toBeDefined();
    expect(exam.author.toString()).toBe(user._id.toString());
  });

  it("should update exam properties", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
      role: 1,
      status: 1,
    });
    const exam = await Exam.create({
      title: "Exam title",
      subtitle: "Exam subtitle",
      description: "Exam description",
      instructions: "Exam instructions",
      author: `${user._id}`,
      public: true,
      year: 2025,
      expression: [],
      questions: [],
    });

    const input: Partial<UpdateExamPropertiesInput> = {
      title: "Updated Exam title",
      public: false,
    };

    const updatedExam = await examService.updateExamProperties(
      `${exam._id}`,
      input
    );
    expect(updatedExam).not.toBeNull();
    expect(updatedExam?.title).toBe("Updated Exam title");
    expect(updatedExam?.public).toBe(false);
  });

  it("should create exam expression", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
      role: 1,
      status: 1,
    });
    const exam = await Exam.create({
      title: "Exam title",
      subtitle: "Exam subtitle",
      description: "Exam description",
      instructions: "Exam instructions",
      author: `${user._id}`,
      public: true,
      year: 2025,
      expression: [],
      questions: [],
    });

    const input: ExpressionInput[] = [
      {
        id: "expr1",
        operator: Operator.EQ,
        value: "42",
        label: "The answer",
        variable: "answerVar",
      },
    ];

    const updatedExam = await examService.createExamExpression(
      `${exam._id}`,
      input
    );
    expect(updatedExam).not.toBeNull();
    expect(updatedExam?.expression.length).toBe(1);
    expect(updatedExam?.expression[0]).toMatchObject({
      id: "expr1",
      operator: Operator.EQ,
      value: "42",
      label: "The answer",
      variable: "answerVar",
    });
  });

  it("should update exam expression", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
      role: 1,
      status: 1,
    });
    const exam = await Exam.create({
      title: "Exam title",
      subtitle: "Exam subtitle",
      description: "Exam description",
      instructions: "Exam instructions",
      author: `${user._id}`,
      public: true,
      year: 2025,
      expression: [
        {
          id: "expr1",
          operator: Operator.EQ,
          value: "42",
          label: "The answer",
          variable: "answerVar",
        },
      ],
      questions: [],
    });

    const input: ExpressionInput = {
      id: "expr1",
      operator: Operator.GT,
      value: "50",
      label: "Updated answer",
      variable: "updatedVar",
    };

    const updatedExam = await examService.updateExamExpression(
      `${exam._id}`,
      input
    );
    expect(updatedExam).not.toBeNull();
    expect(updatedExam?.expression.length).toBe(1);
    expect(updatedExam?.expression[0]).toMatchObject({
      id: "expr1",
      operator: Operator.GT,
      value: "50",
      label: "Updated answer",
      variable: "updatedVar",
    });
  });

  it("should throw error when updating non-existing exam expression", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
      role: 1,
      status: 1,
    });
    const exam = await Exam.create({
      title: "Exam title",
      subtitle: "Exam subtitle",
      description: "Exam description",
      instructions: "Exam instructions",
      author: `${user._id}`,
      public: true,
      year: 2025,
      expression: [
        {
          id: "expr1",
          operator: Operator.EQ,
          value: "42",
          label: "The answer",
          variable: "answerVar",
        },
      ],
      questions: [],
    });
    const input: ExpressionInput = {
      id: "nonExistingExpr",
      operator: Operator.GT,
      value: "50",
      label: "Updated answer",
      variable: "updatedVar",
    };

    await expect(
      examService.updateExamExpression(`${exam._id}`, input)
    ).rejects.toThrow("Expression not found in exam");
  });

  it("should throw error when creating expression for non-existing exam", async () => {
    const input: ExpressionInput[] = [
      {
        id: "expr1",
        operator: Operator.EQ,
        value: "42",
        label: "The answer",
        variable: "answerVar",
      },
    ];
    const nonExistingExamId = new Types.ObjectId().toString();

    await expect(
      examService.createExamExpression(nonExistingExamId, input)
    ).rejects.toThrow("Exam not found");
  });

  it("should throw error when updating expression for non-existing exam", async () => {
    const input: ExpressionInput = {
      id: "expr1",
      operator: Operator.GT,
      value: "50",
      label: "Updated answer",
      variable: "updatedVar",
    };
    const nonExistingExamId = new Types.ObjectId().toString();

    await expect(
      examService.updateExamExpression(nonExistingExamId, input)
    ).rejects.toThrow("Exam not found");
  });

  it("should throw error when deleting expression for non-existing exam", async () => {
    const nonExistingExamId = new Types.ObjectId().toString();
    const expressionId = "expr1";

    await expect(
      examService.deleteExamExpression(nonExistingExamId, expressionId)
    ).rejects.toThrow("Exam not found");
  });

  it("should throw error when deleting non-existing exam expression", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
      role: 1,
      status: 1,
    });
    const exam = await Exam.create({
      title: "Exam title",
      subtitle: "Exam subtitle",
      description: "Exam description",
      instructions: "Exam instructions",
      author: `${user._id}`,
      public: true,
      year: 2025,
      expression: [
        {
          id: "expr1",
          operator: Operator.EQ,
          value: "42",
          label: "The answer",
          variable: "answerVar",
        },
      ],
      questions: [],
    });

    await expect(
      examService.deleteExamExpression(`${exam._id}`, "nonExistingExpr")
    ).rejects.toThrow("Expression not found in exam");
  });

  it("should create exam question", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
      role: 1,
      status: 1,
    });
    const exam = await Exam.create({
      title: "Exam title",
      subtitle: "Exam subtitle",
      description: "Exam description",
      instructions: "Exam instructions",
      author: `${user._id}`,
      public: true,
      year: 2025,
      expression: [],
      questions: [],
    });

    const input: QuestionInput[] = [
      {
        id: "quest1",
        text: "question text",
        expression: {
          id: "innerExpr1",
          label: "label",
          operator: Operator.EQ,
          value: "value",
          variable: "variable",
          reference: "",
        },
        answer: Answer.RADIO,
        answers: [{ id: "ans1", content: "ans content", value: "ansValue" }],
        reference: "",
      },
      {
        id: "quest2",
        text: "question 2 text",
        expression: {
          id: "inner2Expr1",
          label: "label2",
          operator: Operator.EQ,
          value: "value2",
          variable: "variable2",
          reference: "",
        },
        answer: Answer.RADIO,
        answers: [{ id: "ans2", content: "ans2 content", value: "ansValue" }],
        reference: "",
      },
    ];

    const updatedExam = await examService.createExamQuestions(
      `${exam._id}`,
      input
    );
    expect(updatedExam).not.toBeNull();
    expect(updatedExam?.questions.length).toBe(2);
    expect(updatedExam?.questions[1]).toMatchObject({
      id: "quest2",
      text: "question 2 text",
      expression: {
        id: "inner2Expr1",
        label: "label2",
        operator: Operator.EQ,
        value: "value2",
        variable: "variable2",
        reference: "",
      },
      answer: Answer.RADIO,
      answers: [{ id: "ans2", content: "ans2 content", value: "ansValue" }],
      reference: "",
    });
  });

  it("should update exam question", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
      role: 1,
      status: 1,
    });
    const exam = await Exam.create({
      title: "Exam title",
      subtitle: "Exam subtitle",
      description: "Exam description",
      instructions: "Exam instructions",
      author: `${user._id}`,
      public: true,
      year: 2025,
      expression: [],
      questions: [
        {
          id: "quest1",
          text: "question text",
          expression: {
            id: "innerExpr1",
            label: "label",
            operator: Operator.EQ,
            value: "value",
            variable: "variable",
            reference: "",
          },
          answer: Answer.RADIO,
          answers: [{ id: "ans1", content: "ans content", value: "ansValue" }],
          reference: "",
        },
      ],
    });

    const input: QuestionInput = {
      id: "quest1",
      text: "new question text",
      expression: {
        id: "innerExpr1",
        label: "new label",
        operator: Operator.GT,
        value: "value",
        variable: "variable",
        reference: "",
      },
      answer: Answer.RADIO,
      answers: [
        { id: "ans1", content: "ans content", value: "ansValue" },
        { id: "ans2", content: "ans content", value: "ansValue" },
      ],
      reference: "",
    };

    const updatedExam = await examService.updateExamQuestion(
      `${exam._id}`,
      input
    );

    expect(updatedExam).not.toBeNull();
    expect(updatedExam?.questions.length).toBe(1);
    expect(updatedExam?.questions[0]).toMatchObject({
      id: "quest1",
      text: "new question text",
      expression: {
        id: "innerExpr1",
        label: "new label",
        operator: Operator.GT,
        value: "value",
        variable: "variable",
        reference: "",
      },
      answer: Answer.RADIO,
      answers: [
        { id: "ans1", content: "ans content", value: "ansValue" },
        { id: "ans2", content: "ans content", value: "ansValue" },
      ],
      reference: "",
    });
  });

  it("should throw error when updating non-existing exam question", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
      role: 1,
      status: 1,
    });
    const exam = await Exam.create({
      title: "Exam title",
      subtitle: "Exam subtitle",
      description: "Exam description",
      instructions: "Exam instructions",
      author: `${user._id}`,
      public: true,
      year: 2025,
      expression: [],
      questions: [
        {
          id: "quest1",
          text: "question text",
          expression: {
            id: "innerExpr1",
            label: "label",
            operator: Operator.EQ,
            value: "value",
            variable: "variable",
            reference: "",
          },
          answer: Answer.RADIO,
          answers: [{ id: "ans1", content: "ans content", value: "ansValue" }],
          reference: "",
        },
      ],
    });
    const input: QuestionInput = {
      id: "nonExistingQuest",
      text: "question text",
      expression: {
        id: "innerExpr1",
        label: "label",
        operator: Operator.EQ,
        value: "value",
        variable: "variable",
        reference: "",
      },
      answer: Answer.RADIO,
      answers: [{ id: "ans1", content: "ans content", value: "ansValue" }],
      reference: "",
    };

    await expect(
      examService.updateExamQuestion(`${exam._id}`, input)
    ).rejects.toThrow("Question not found in exam");
  });

  it("should throw error when creating question for non-existing exam", async () => {
    const input: QuestionInput[] = [
      {
        id: "quest1",
        text: "question text",
        expression: {
          id: "innerExpr1",
          label: "label",
          operator: Operator.EQ,
          value: "value",
          variable: "variable",
          reference: "",
        },
        answer: Answer.RADIO,
        answers: [{ id: "ans1", content: "ans content", value: "ansValue" }],
        reference: "",
      },
    ];
    const nonExistingExamId = new Types.ObjectId().toString();

    await expect(
      examService.createExamQuestions(nonExistingExamId, input)
    ).rejects.toThrow("Exam not found");
  });

  it("should throw error when updating question for non-existing exam", async () => {
    const input: QuestionInput = {
      id: "quest1",
      text: "question text",
      expression: {
        id: "innerExpr1",
        label: "label",
        operator: Operator.EQ,
        value: "value",
        variable: "variable",
        reference: "",
      },
      answer: Answer.RADIO,
      answers: [{ id: "ans1", content: "ans content", value: "ansValue" }],
      reference: "",
    };
    const nonExistingExamId = new Types.ObjectId().toString();

    await expect(
      examService.updateExamQuestion(nonExistingExamId, input)
    ).rejects.toThrow("Exam not found");
  });

  it("should throw error when deleting question for non-existing exam", async () => {
    const nonExistingExamId = new Types.ObjectId().toString();
    const questionId = "quest1";

    await expect(
      examService.deleteExamQuestion(nonExistingExamId, questionId)
    ).rejects.toThrow("Exam not found");
  });

  it("should throw error when deleting non-existing exam question", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
      role: 1,
      status: 1,
    });
    const exam = await Exam.create({
      title: "Exam title",
      subtitle: "Exam subtitle",
      description: "Exam description",
      instructions: "Exam instructions",
      author: `${user._id}`,
      public: true,
      year: 2025,
      expression: [],
      questions: [
        {
          id: "quest1",
          text: "question text",
          expression: {
            id: "innerExpr1",
            label: "label",
            operator: Operator.EQ,
            value: "value",
            variable: "variable",
            reference: "",
          },
          answer: Answer.RADIO,
          answers: [{ id: "ans1", content: "ans content", value: "ansValue" }],
          reference: "",
        },
      ],
    });

    await expect(
      examService.deleteExamQuestion(`${exam._id}`, "nonExistingQuest")
    ).rejects.toThrow("Question not found in exam");
  });

  it("should create an exam", async () => {
    const user = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
      role: 1,
      status: 1,
    });
    const input: CreateExamInput = {
      title: "Exam title",
      subtitle: "Exam subtitle",
      description: "Exam description",
      instructions: "Exam instructions",
      author: `${user._id}`,
      public: true,
      year: 2025,
      expression: [],
      questions: [],
    };

    const exam = await examService.createExam(input);

    await examService.deleteExam(exam._id.toString());
    const deletedExam = await Exam.findById(exam._id.toString());
    expect(deletedExam).toBeNull();
  });

  it("should throw error when deleting non-existing exam", async () => {
    const nonExistingExamId = new Types.ObjectId().toString();

    await expect(examService.deleteExam(nonExistingExamId)).rejects.toThrow(
      "Exam not found"
    );
  });
});
