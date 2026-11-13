import { describe, it, expect } from "@jest/globals";
import { sanitizeError } from "../../../middlewares/logger.ts";

describe("sanitizeError", () => {
  it("no expone el mensaje de un Error genérico", () => {
    const err = new Error("patient John Doe medicalHistory HIV");
    const safe = sanitizeError(err);
    expect(safe).not.toHaveProperty("message");
    expect(JSON.stringify(safe)).not.toContain("John Doe");
  });

  it("oculta el valor de un duplicado", () => {
    const err = Object.assign(new Error("E11000 duplicate key email a@b.com"), {
      name: "MongoServerError",
      code: 11000,
    });
    expect(sanitizeError(err).message).toBe("duplicate_key");
  });

  it("solo devuelve nombres de campos en ValidationError", () => {
    const err = Object.assign(new Error("Validation failed"), {
      name: "ValidationError",
      errors: { email: { value: "a@b.com" } },
    });
    expect(sanitizeError(err).fields).toEqual(["email"]);
  });
});
