import { mergeResolvers } from "@graphql-tools/merge";

// import { scalars } from "../scalars.ts";
import userResolvers from "./user.resolver.ts";

export const resolvers = mergeResolvers([userResolvers]);
