import { mergeResolvers } from "@graphql-tools/merge";

// import { scalars } from "../scalars.ts";
import userResolvers from "./user.resolver.ts";
import examResolvers from "./exam.resolver.ts";
import patientResolvers from "./patient.resolver.ts";
import statResolvers from "./stat.resolver.ts";

export const resolvers = mergeResolvers([
  userResolvers,
  examResolvers,
  patientResolvers,
  statResolvers,
]);
