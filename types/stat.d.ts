export type StatResult = {
  value: string;
  text: string;
};

export type StatAnswer = {
  id: string;
  answer: string;
};

export type CreateStatInput = {
  examId: string;
  patientId: string;
  authorId: string;
  completedAt: string;
  result: StatResult;
  answers: StatAnswer[];
  address?: string;
};

export type StatFilterInput = {
  examId?: string;
  completedAt?: string;
  resultValue?: string;
  address?: string;
};

export type StatOutput = {
  id: string;
  exam: Exam;
  author: User;
  completedAt: string;
  result: StatResult;
  answers: StatAnswer[];
  createdAt: string;
  address: string;
};

export type Stat = {
  id: string;
  exam: string;
  patient: string;
  author: string;
  completedAt: string;
  result: StatResult;
  answers: StatAnswer[];
  address?: string;
  createdAt: string;
};
