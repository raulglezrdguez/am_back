import { mergeTypeDefs } from "@graphql-tools/merge";
import { userTypeDefs } from "./user.typeDefs.ts";
import { examTypeDefs } from "./exam.typeDefs.ts";
import { patientTypeDefs } from "./patient.typeDefs.ts";
import { scalarsTypeDefs } from "../scalars.ts";

export const typeDefs = mergeTypeDefs([
  userTypeDefs,
  examTypeDefs,
  patientTypeDefs,
  scalarsTypeDefs,
]);
