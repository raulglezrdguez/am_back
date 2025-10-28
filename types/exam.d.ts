import { Operator } from "./exam.ts";

export type CreateExamInput = {
  title: string;
  subtitle: string;
  instructions: string;
  description: string;
  author: string;
  year: number;
  public: boolean;
  expression?: ExpressionInput[];
  questions?: QuestionInput[];
};

export type UpdateExamPropertiesInput = {
  title: string;
  subtitle: string;
  instructions: string;
  description: string;
  author: string;
  year: number;
  public: boolean;
};

export type ExpressionInput = {
  id: string;
  operator: Operator;
  value: string | boolean | number;
  label: string;
  reference?: string;
  variable: string;
};

export type AnswerOptionInput = {
  id: string;
  value: string;
  content: string;
};

export type QuestionInput = {
  id: string;
  text: string;
  expression: ExpressionInput;
  answer: string;
  reference?: string;
  answers?: AnswerOptionInput[];
};
