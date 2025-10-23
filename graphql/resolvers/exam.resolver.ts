import * as examService from "../../services/exam.service.ts";
import type {
  CreateExamInput,
  AnswerOptionInput,
  ExpressionInput,
  QuestionInput,
  UpdateExamPropertiesInput,
} from "../../types/exam.d.ts";
import { type ApolloContext } from "../../config/apollo.context.ts";

export default {
  Query: {
    exams: () => examService.listExams(),
    exam: (_: any, { id }: { id: string }) => examService.getExamById(id),
    myExams: (_: any, __: any, { currentUser }: ApolloContext) => {
      if (!currentUser) return [];
      return examService.listExamsByAuthor(currentUser.id);
    },
  },
  Mutation: {
    createExam: (
      _: any,
      { input }: { input: CreateExamInput },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");
      const examInput = { ...input, author: currentUser.id };
      return examService.createExam(examInput);
    },
    updateExamProperties: async (
      _: any,
      { id, input }: { id: string; input: Partial<UpdateExamPropertiesInput> },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      const exam = await examService.getExamById(id);
      if (!exam) throw new Error("Exam not found");
      if (exam.author.toString() !== currentUser.id)
        throw new Error("Not authorized to update this exam");

      return examService.updateExamProperties(id, input);
    },
    createExamExpression: async (
      _: any,
      { id, input }: { id: string; input: ExpressionInput[] },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      const exam = await examService.getExamById(id);
      if (!exam) throw new Error("Exam not found");
      if (exam.author.toString() !== currentUser.id)
        throw new Error("Not authorized to create expression to this exam");

      return examService.createExamExpression(id, input);
    },
    updateExamExpression: async (
      _: any,
      { id, input }: { id: string; input: ExpressionInput },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      const exam = await examService.getExamById(id);
      if (!exam) throw new Error("Exam not found");
      if (exam.author.toString() !== currentUser.id)
        throw new Error("Not authorized to update expression to this exam");

      return examService.updateExamExpression(id, input);
    },
    deleteExamExpression: async (
      _: any,
      { id, expressionId }: { id: string; expressionId: string },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      const exam = await examService.getExamById(id);
      if (!exam) throw new Error("Exam not found");
      if (exam.author.toString() !== currentUser.id)
        throw new Error("Not authorized to delete expression from this exam");

      return examService.deleteExamExpression(id, expressionId);
    },
    deleteExam: async (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      const exam = await examService.getExamById(id);
      if (!exam) throw new Error("Exam not found");
      if (exam.author.toString() !== currentUser.id)
        throw new Error("Not authorized to delete this exam");

      return examService.deleteExam(id);
    },
  },
};
