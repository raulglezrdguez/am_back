import Exam from "../models/exam.model.ts";
import Stat from "../models/stat.model.ts";
import { UPDATE_OPTS } from "./utils.ts";

import type {
  CreateExamInput,
  ExpressionInput,
  QuestionInput,
  UpdateExamPropertiesInput,
} from "../types/exam.d.ts";
import {
  clampLimit,
  buildCursorFilter,
  encodeCursor,
  type CursorPage,
} from "./utils.ts";
import { loadPopulated } from "./load.ts";

const EXAM_LIST_PROJECTION =
  "_id title subtitle instructions description author year public createdAt";
const EXAM_POPULATES = [
  { path: "author", select: "name email role status createdAt updatedAt" },
];
const NOT_DELETED = { deletedAt: null };

// List only public exams
export const listExams = async (
  cursor?: string,
  limitInput?: number,
): Promise<CursorPage<any>> => {
  const limit = clampLimit(limitInput);
  const rows = await Exam.find({
    ...NOT_DELETED,
    public: true,
    ...buildCursorFilter("createdAt", cursor),
  })
    .select(EXAM_LIST_PROJECTION) // ← sin questions/expression
    .populate("author", "name")
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    items,
    hasMore,
    nextCursor: hasMore
      ? encodeCursor(
          items[items.length - 1].createdAt,
          String(items[items.length - 1]._id),
        )
      : null,
  };
};

// Get exam by ID only if it's public or belongs to the author
export const getExamById = async (id: string, userId: string | null) => {
  const filter = userId
    ? { ...NOT_DELETED, _id: id, $or: [{ public: true }, { author: userId }] }
    : { ...NOT_DELETED, _id: id, public: true };
  const exam = await Exam.findOne(filter).populate(EXAM_POPULATES[0]);
  return exam ? exam.toObject({ virtuals: true }) : null;
};

// List exams by author
export const listExamsByAuthor = async (
  authorId: string,
  cursor?: string,
  limitInput?: number,
): Promise<CursorPage<any>> => {
  const limit = clampLimit(limitInput);
  const rows = await Exam.find({
    ...NOT_DELETED,
    author: authorId,
    ...buildCursorFilter("createdAt", cursor),
  })
    .select(EXAM_LIST_PROJECTION)
    .populate("author", "name")
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    items,
    hasMore,
    nextCursor: hasMore
      ? encodeCursor(
          items[items.length - 1].createdAt,
          String(items[items.length - 1]._id),
        )
      : null,
  };
};

// Create a new exam
export const createExam = async (input: CreateExamInput) => {
  const exam = await Exam.create(input);
  return loadPopulated(Exam, exam._id.toString(), EXAM_POPULATES);
};

// Update exam properties
export const updateExamProperties = async (
  id: string,
  input: Partial<UpdateExamPropertiesInput>,
) => {
  const exam = await Exam.findByIdAndUpdate(id, input, UPDATE_OPTS).populate(
    EXAM_POPULATES[0],
  );
  if (!exam || exam.deletedAt) throw new Error("Exam not found");
  return exam.toObject({ virtuals: true });
};

// Create exam expressions
export const createExamExpression = async (
  id: string,
  input: ExpressionInput[],
) => {
  const exam = await Exam.findById(id);
  if (!exam || exam.deletedAt) throw new Error("Exam not found");

  exam.expression?.push(...input);

  const doc = await exam.save();
  await doc.populate(EXAM_POPULATES[0]);
  return doc.toObject({ virtuals: true });
};

// update exam expression
export const updateExamExpression = async (
  id: string,
  input: ExpressionInput,
) => {
  const exam = await Exam.findById(id);
  if (!exam || exam.deletedAt) throw new Error("Exam not found");

  const expression = exam.expression?.find((expr) => expr.id === input.id);
  if (!expression) throw new Error("Expression not found in exam");

  expression.operator = input.operator;
  expression.value = input.value;
  expression.label = input.label;
  expression.reference = input.reference || "";
  expression.variable = input.variable;

  const doc = await exam.save();
  await doc.populate(EXAM_POPULATES[0]);
  return doc.toObject({ virtuals: true });
};

// delete exam expression
export const deleteExamExpression = async (
  id: string,
  expressionId: string,
) => {
  const exam = await Exam.findById(id);
  if (!exam || exam.deletedAt) throw new Error("Exam not found");

  const index = exam.expression?.findIndex((expr) => expr.id === expressionId);
  if (index === -1 || index === undefined)
    throw new Error("Expression not found in exam");

  exam.expression?.splice(index, 1);

  const doc = await exam.save();
  await doc.populate(EXAM_POPULATES[0]);
  return doc.toObject({ virtuals: true });
};

// Create exam questions
export const createExamQuestions = async (
  id: string,
  input: QuestionInput[],
) => {
  const exam = await Exam.findById(id);
  if (!exam || exam.deletedAt) throw new Error("Exam not found");

  exam.questions?.push(...input);

  const doc = await exam.save();
  await doc.populate(EXAM_POPULATES[0]);
  return doc.toObject({ virtuals: true });
};

// update exam question
export const updateExamQuestion = async (id: string, input: QuestionInput) => {
  const exam = await Exam.findById(id);
  if (!exam || exam.deletedAt) throw new Error("Exam not found");

  const question = exam.questions?.find((quest) => quest.id === input.id);
  if (!question) throw new Error("Question not found in exam");

  question.id = input.id;
  question.text = input.text;
  question.expression.id = input.expression.id;
  question.expression.label = input.expression.label;
  question.expression.operator = input.expression.operator;
  question.expression.reference = input.expression.reference || "";
  question.expression.value = input.expression.value;
  question.expression.variable = input.expression.variable;
  question.answer = input.answer;
  question.reference = input.reference || "";
  if (input.answers) {
    question.answers?.splice(0, question.answers.length);
    question.answers?.push(...input.answers);
  }

  const doc = await exam.save();
  await doc.populate(EXAM_POPULATES[0]);
  return doc.toObject({ virtuals: true });
};
export const updateExamQuestionId = async (
  id: string,
  questionId: string,
  input: QuestionInput,
) => {
  const exam = await Exam.findById(id);
  if (!exam || exam.deletedAt) throw new Error("Exam not found");

  const question = exam.questions?.find((quest) => quest.id === questionId);
  if (!question) throw new Error("Question not found in exam");

  question.id = input.id;
  question.text = input.text;
  question.expression.id = input.expression.id;
  question.expression.label = input.expression.label;
  question.expression.operator = input.expression.operator;
  question.expression.reference = input.expression.reference || "";
  question.expression.value = input.expression.value;
  question.expression.variable = input.expression.variable;
  question.answer = input.answer;
  question.reference = input.reference || "";
  if (input.answers) {
    question.answers?.splice(0, question.answers.length);
    question.answers?.push(...input.answers);
  }

  const doc = await exam.save();
  await doc.populate(EXAM_POPULATES[0]);
  return doc.toObject({ virtuals: true });
};

// delete exam question
export const deleteExamQuestion = async (id: string, questionId: string) => {
  const exam = await Exam.findById(id);
  if (!exam || exam.deletedAt) throw new Error("Exam not found");

  const index = exam.questions?.findIndex((quest) => quest.id === questionId);
  if (index === -1 || index === undefined)
    throw new Error("Question not found in exam");

  exam.questions?.splice(index, 1);

  const doc = await exam.save();
  await doc.populate(EXAM_POPULATES[0]);
  return doc.toObject({ virtuals: true });
};

// Delete an exam
export const deleteExam = async (id: string) => {
  const statsCount = await Stat.countDocuments({ exam: id });
  if (statsCount > 0) {
    throw new Error(
      `Cannot delete exam: ${statsCount} statistics reference it.`,
    );
  }

  const exam = await Exam.findByIdAndDelete(id).populate(EXAM_POPULATES[0]);
  if (!exam) throw new Error("Exam not found");

  return exam.toObject({ virtuals: true });
};
