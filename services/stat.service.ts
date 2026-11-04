import mongoose from "mongoose";
import {
  escapeRegex,
  clampLimit,
  buildCursorFilter,
  encodeCursor,
  type CursorPage,
} from "./utils.ts";
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

// Proyección mínima del examen: NO traer questions/expression
const populateExamMinimal = {
  path: "exam",
  select: "title subtitle year", // ← sin questions/expression
  populate: { path: "author", select: "name" },
};

const STAT_PROJECTION =
  "exam patient author completedAt result address createdAt";

export type StatListOptions = {
  actor: StatActor;
  limit?: number;
  cursor?: string;
};

const buildBaseScope = (actor: StatActor) => buildAuthorScope(actor);

function toCursorPage<T extends { _id: any; completedAt: Date }>(
  rows: T[],
  limit: number,
  cursorOf: (row: T) => string,
): CursorPage<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? cursorOf(items[items.length - 1]) : null;
  return { items, nextCursor, hasMore };
}

export const getStatById = async (id: string, actor: StatActor) =>
  await Stat.findOne({ _id: id, ...buildAuthorScope(actor) })
    .select(STAT_PROJECTION)
    .populate(populateExamMinimal)
    .populate("patient", "identifier name birthDate sex")
    .populate("author", "name")
    .lean();

export const getStatsByPatient = async (
  id: string,
  actor: StatActor,
  options: StatListOptions = { actor },
): Promise<CursorPage<unknown>> => {
  const limit = clampLimit(options.limit);
  const filter = {
    patient: id,
    ...buildBaseScope(actor),
    ...buildCursorFilter("completedAt", options.cursor),
  };

  const items = await Stat.find(filter)
    .select(STAT_PROJECTION)
    .populate(populateExamMinimal)
    .populate("patient", "identifier name birthDate sex")
    .populate("author", "name")
    .sort({ completedAt: -1, _id: -1 })
    .limit(limit + 1) // +1 para saber si hay siguiente
    .lean();

  return toCursorPage(items, limit, (s: any) =>
    encodeCursor(s.completedAt, String(s._id)),
  );
};

export const getStatsByExam = async (
  id: string,
  actor: StatActor,
  options: StatListOptions = { actor },
): Promise<CursorPage<unknown>> => {
  const limit = clampLimit(options.limit);
  const filter = {
    exam: id,
    ...buildBaseScope(actor),
    ...buildCursorFilter("completedAt", options.cursor),
  };

  const items = await Stat.find(filter)
    .select(STAT_PROJECTION)
    .populate(populateExamMinimal)
    .populate("patient", "identifier name")
    .populate("author", "name")
    .sort({ completedAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  return toCursorPage(items, limit, (s: any) =>
    encodeCursor(s.completedAt, String(s._id)),
  );
};

// getStats (listado con filtros) con cursor
export const getStats = async (
  filter: StatFilterInput,
  options: StatListOptions,
): Promise<CursorPage<unknown>> => {
  const { actor } = options;
  const limit = clampLimit(options.limit);
  const mongoFilter: Record<string, any> = { ...buildAuthorScope(actor) };

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

  Object.assign(mongoFilter, buildCursorFilter("completedAt", options.cursor));

  const items = await Stat.find(mongoFilter)
    .select(STAT_PROJECTION)
    .populate(populateExamMinimal)
    .populate("author", "name")
    .sort({ completedAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  return toCursorPage(items, limit, (s: any) =>
    encodeCursor(s.completedAt, String(s._id)),
  );
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
