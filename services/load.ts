import { type Model, type PopulateOptions } from "mongoose";

/**
 * Carga un documento por _id, aplica populate y devuelve un POJO con los
 * subdocumentos poblados ya normalizados (id presente).
 * `populates` acepta el mismo formato que Model.populate.
 */
export const loadPopulated = async <T>(
  model: Model<T>,
  id: string,
  populates: PopulateOptions[],
) => {
  const doc = await model.findById(id).select("-__v");
  if (!doc) return null;
  for (const p of populates) await model.populate(doc, p);
  return doc.toObject({ virtuals: true }); // virtuals: id incluido
};
