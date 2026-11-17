import { GraphQLError } from "graphql";
import type { AppError } from "../errors/appError.ts";

export const gqlError = (error: AppError): GraphQLError =>
  new GraphQLError(error.message, {
    extensions: {
      code: error.code,
      ...(error.details ?? {}),
    },
    originalError: error,
  });
