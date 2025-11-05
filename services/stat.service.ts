import mongoose from "mongoose";
import Stat from "../models/stat.model.ts";
import type {
  CreateStatInput,
  StatAnswer,
  StatFilterInput,
  StatResult,
} from "../types/stat.d.ts";

export const getStatById = async (id: string) =>
  await Stat.findById(id)
    .populate("exam")
    .populate("author")
    .populate("patient")
    .lean();

export const getStatsByPatient = async (id: string) =>
  await Stat.find({ patient: id })
    .populate("exam")
    .populate("author")
    .populate("patient")
    .lean();

export const getStatsByExam = async (id: string) =>
  await Stat.find({ exam: id })
    .populate("exam")
    .populate("author")
    .populate("patient")
    .lean();

export const getStats = async (filter: StatFilterInput) => {
  const mongoFilter: any = {};

  if (filter.examId) mongoFilter.exam = filter.examId;
  if (filter.resultValue) mongoFilter["result.value"] = filter.resultValue;
  if (filter.address) {
    mongoFilter.address = {};
    mongoFilter.address["$regex"] = filter.address;
    mongoFilter.address["$options"] = "i";
  }
  if (filter.completedAt) {
    mongoFilter.completedAt = { $lte: new Date(filter.completedAt) };
  }

  return Stat.find(mongoFilter).populate("exam").populate("author").lean();
};

export const createStat = async (input: CreateStatInput) => {
  const stat = await Stat.create({
    // id: crypto.randomUUID(),
    exam: input.examId,
    patient: input.patientId,
    author: input.authorId,
    completedAt: input.completedAt,
    result: {
      value: input.result.value,
      text: input.result.text,
    } as StatResult,
    answers: input.answers.map(
      (ans: StatAnswer) =>
        ({
          id: ans.id,
          answer: ans.answer,
        } as StatAnswer)
    ),
    address: input.address,
  });

  return await Stat.findById(stat._id)
    .populate("exam")
    .populate("patient")
    .populate("author")
    .lean();
};
