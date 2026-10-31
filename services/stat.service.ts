import mongoose from "mongoose";
import { escapeRegex } from "./utils.ts";
import Stat from "../models/stat.model.ts";
import type {
  CreateStatInput,
  StatAnswer,
  StatFilterInput,
  StatResult,
} from "../types/stat.d.ts";

import {
  NotFoundError,
  buildAuthorScope,
  type StatActor,
} from "./stat.policy.ts";

const populateExamWithAuthor = {
  path: "exam",
  select: "title subtitle year",
  populate: { path: "author", select: "name" },
};

export const getStatById = async (id: string, actor: StatActor) =>
  await Stat.findOne({ _id: id, ...buildAuthorScope(actor) })
    .populate("exam")
    .populate("author")
    .populate("patient")
    .lean();

export const getStatsByPatient = async (id: string, actor: StatActor) =>
  Stat.find({ patient: id, ...buildAuthorScope(actor) })
    .populate("exam")
    .populate("author")
    .populate("patient")
    .lean();

export const getStatsByExam = async (id: string, actor: StatActor) =>
  Stat.find({ exam: id, ...buildAuthorScope(actor) })
    .populate("exam")
    .populate("author")
    .populate("patient")
    .lean();

export type StatListOptions = {
  actor: StatActor;
  limit?: number;
  skip?: number;
};

export const getStats = async (
  filter: StatFilterInput,
  options: StatListOptions,
) => {
  const { actor, limit = 50, skip = 0 } = options;
  const mongoFilter: Record<string, any> = {
    ...buildAuthorScope(actor),
  };

  if (filter.examId) mongoFilter.exam = filter.examId;
  if (filter.resultValue) mongoFilter["result.value"] = filter.resultValue;
  if (filter.address) {
    mongoFilter.address = {
      $regex: escapeRegex(filter.address),
      $options: "i",
    };
  }
  if (filter.completedAt) {
    mongoFilter.completedAt = { $lte: new Date(filter.completedAt) };
  }

  return Stat.find(mongoFilter)
    .populate(populateExamWithAuthor)
    .populate("author", "name")
    .skip(skip)
    .limit(Math.min(limit, 100))
    .lean();
};

export const createStat = async (input: CreateStatInput, actor: StatActor) => {
  // Refuerzo: el authorId debe ser el del actor (o admin puede crear en nombre de otro si lo permites).
  if (!actor || (actor.role !== 0 && input.authorId !== actor.id)) {
    // Si prefieres que admin pueda crear para otros, quita esta rama.
    throw new NotFoundError("Stat not found");
  }

  const stat = await Stat.create({
    exam: input.examId,
    patient: input.patientId,
    author: input.authorId,
    completedAt: input.completedAt,
    result: {
      value: input.result.value,
      text: input.result.text,
    } as StatResult,
    answers: input.answers.map(
      (ans: StatAnswer) => ({ id: ans.id, answer: ans.answer }) as StatAnswer,
    ),
    address: input.address,
  });

  // Devolvemos el doc recién creado con scope (por si el author cambió en carrera).
  const created = await Stat.findOne({
    _id: stat._id,
    ...buildAuthorScope(actor),
  })
    .populate("exam")
    .populate("patient")
    .populate("author")
    .lean();

  if (!created) throw new NotFoundError("Stat not found");
  return created;
};
