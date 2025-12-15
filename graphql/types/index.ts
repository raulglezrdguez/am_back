import { mergeTypeDefs } from "@graphql-tools/merge";
import { userTypeDefs } from "./user.typeDefs.ts";
import { examTypeDefs } from "./exam.typeDefs.ts";
import { patientTypeDefs } from "./patient.typeDefs.ts";
import { statTypeDefs } from "./stat.typeDefs.ts";
import { diagramTypeDefs } from "./diagram.typeDefs.ts";
import { scalarsTypeDefs } from "../scalars.ts";

export const typeDefs = mergeTypeDefs([
  userTypeDefs,
  examTypeDefs,
  patientTypeDefs,
  statTypeDefs,
  diagramTypeDefs,
  scalarsTypeDefs,
]);
