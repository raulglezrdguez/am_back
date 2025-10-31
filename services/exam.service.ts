import Exam from "../models/exam.model.ts";
import type {
  CreateExamInput,
  ExpressionInput,
  QuestionInput,
  UpdateExamPropertiesInput,
} from "../types/exam.d.ts";

// List only public exams
export const listExams = async () =>
  await Exam.find({ public: true }).populate("author", "name email");

// Get exam by ID only if it's public or belongs to the author
export const getExamById = async (id: string, userId: string | null) => {
  if (userId)
    return await Exam.findOne({
      _id: id,
      $or: [{ public: true }, { author: userId }],
    }).populate("author", "name email");

  return await Exam.findOne({ _id: id, public: true }).populate(
    "author",
    "name email"
  );
};

// List exams by author
export const listExamsByAuthor = async (authorId: string) =>
  await Exam.find({ author: authorId }).populate("author", "name email");

// Create a new exam
export const createExam = async (input: CreateExamInput) => {
  const exam = await Exam.create(input);
  return getExamById(exam._id.toString(), exam.author.toString());
};

// Update exam properties
export const updateExamProperties = async (
  id: string,
  input: Partial<UpdateExamPropertiesInput>
) => await Exam.findByIdAndUpdate(id, input, { new: true });

// Create exam expressions
export const createExamExpression = async (
  id: string,
  input: ExpressionInput[]
) => {
  const exam = await Exam.findById(id);
  if (!exam) throw new Error("Exam not found");

  exam.expression?.push(...input);

  return await exam.save();
};

// update exam expression
export const updateExamExpression = async (
  id: string,
  input: ExpressionInput
) => {
  const exam = await Exam.findById(id);
  if (!exam) throw new Error("Exam not found");

  const expression = exam.expression?.find((expr) => expr.id === input.id);
  if (!expression) throw new Error("Expression not found in exam");

  expression.operator = input.operator;
  expression.value = input.value;
  expression.label = input.label;
  expression.reference = input.reference || "";
  expression.variable = input.variable;

  return await exam.save();
};

// delete exam expression
export const deleteExamExpression = async (
  id: string,
  expressionId: string
) => {
  const exam = await Exam.findById(id);
  if (!exam) throw new Error("Exam not found");

  const index = exam.expression?.findIndex((expr) => expr.id === expressionId);
  if (index === -1 || index === undefined)
    throw new Error("Expression not found in exam");

  exam.expression?.splice(index, 1);

  return await exam.save();
};

// Create exam questions
export const createExamQuestions = async (
  id: string,
  input: QuestionInput[]
) => {
  const exam = await Exam.findById(id);
  if (!exam) throw new Error("Exam not found");

  exam.questions?.push(...input);

  return await exam.save();
};

// update exam question
export const updateExamQuestion = async (id: string, input: QuestionInput) => {
  const exam = await Exam.findById(id);
  if (!exam) throw new Error("Exam not found");

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

  return await exam.save();
};

// delete exam question
export const deleteExamQuestion = async (id: string, questionId: string) => {
  const exam = await Exam.findById(id);
  if (!exam) throw new Error("Exam not found");

  const index = exam.questions?.findIndex((quest) => quest.id === questionId);
  if (index === -1 || index === undefined)
    throw new Error("Question not found in exam");

  exam.questions?.splice(index, 1);

  return await exam.save();
};

// Delete an exam
export const deleteExam = async (id: string) => {
  const exam = await Exam.findById(id);
  if (!exam) throw new Error("Exam not found");

  return await Exam.findByIdAndDelete(id);
};
