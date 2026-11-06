// services/load.ts
import mongoose, { type Model } from "mongoose";

/**
 * Carga un documento por _id, aplica populate y devuelve un POJO con los
 * subdocumentos poblados ya normalizados (id presente).
 * `populates` acepta el mismo formato que Model.populate.
 */
export const loadPopulated = async <T>(
  model: Model<T>,
  id: string,
  populates: Parameters<Model<T>["populate"]>[0][],
) => {
  const doc = await model.findById(id).select("-__v");
  if (!doc) return null;
  for (const p of populates) await doc.populate(p as any);
  return doc.toObject({ virtuals: true }); // virtuals: id incluido
};
