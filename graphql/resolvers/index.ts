import { mergeResolvers } from "@graphql-tools/merge";

// import { scalars } from "../scalars.ts";
import userResolvers from "./user.resolver.ts";
import patientResolvers from "./patient.resolver.ts";

export const resolvers = mergeResolvers([userResolvers, patientResolvers]);
