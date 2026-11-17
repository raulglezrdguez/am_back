import { describe, it, expect } from "@jest/globals";
import { GraphQLError } from "graphql";
import { formatGraphQLError } from "../../../errors/graphqlErrors.ts";

const format = (error: unknown, isProduction = true) =>
  formatGraphQLError(
    {
      message: (error as any)?.message ?? "",
      extensions: {},
      path: ["signup"],
    },
    error,
    { isProduction, requestId: "req-1", errorId: "err-1" },
  );

describe("formatGraphQLError", () => {
  it("mapea duplicate key a CONFLICT y no filtra internals", () => {
    const mongo = Object.assign(
      new Error(
        'E11000 duplicate key error collection: test.users index: email_1 dup key: { email: "alice@x.com" }',
      ),
      { name: "MongoServerError", code: 11000, keyPattern: { email: 1 } },
    );

    const out = format(
      new GraphQLError(mongo.message, { originalError: mongo }),
    );

    expect(out.extensions).toMatchObject({
      code: "CONFLICT",
      requestId: "req-1",
      errorId: "err-1",
      fields: ["email"],
    });
    expect(JSON.stringify(out)).not.toMatch(
      /E11000|duplicate key|test\.users|email_1|alice@x\.com/,
    );
  });

  it("mapea CastError a BAD_USER_INPUT sin ObjectId ni modelo", () => {
    const cast = Object.assign(
      new Error(
        'Cast to ObjectId failed for value "not-an-objectid" for model "Patient"',
      ),
      { name: "CastError" },
    );

    const out = format(cast);
    expect(out.extensions?.code).toBe("BAD_USER_INPUT");
    expect(JSON.stringify(out)).not.toMatch(
      /Cast|ObjectId|Patient|not-an-objectid/,
    );
  });

  it("mapea ValidationError a BAD_USER_INPUT con nombres de campos", () => {
    const validation = Object.assign(new Error("Validation failed"), {
      name: "ValidationError",
      errors: { birthDate: { value: "31-02-2020" } },
    });

    const out = format(validation);
    expect(out.extensions).toMatchObject({
      code: "BAD_USER_INPUT",
      fields: ["birthDate"],
    });
    expect(JSON.stringify(out)).not.toContain("31-02-2020");
  });

  it("mantiene UNAUTHENTICATED y mensaje seguro", () => {
    const err = new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
    expect(format(err).extensions?.code).toBe("UNAUTHENTICATED");
  });

  it("oculta un error interno desconocido en cualquier entorno", () => {
    const out = format(new Error("patient John Doe HIV"));
    expect(out.extensions?.code).toBe("INTERNAL_SERVER_ERROR");
    expect(JSON.stringify(out)).not.toContain("John Doe");
  });
});
