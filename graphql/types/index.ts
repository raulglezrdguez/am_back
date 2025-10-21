import { mergeTypeDefs } from "@graphql-tools/merge";
import { userTypeDefs } from "./user.typeDefs.ts";
import { scalarsTypeDefs } from "../scalars.ts";

export const typeDefs = mergeTypeDefs([userTypeDefs, scalarsTypeDefs]);
