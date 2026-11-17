import { describe, it, expect, jest } from "@jest/globals";
import { errorHandler } from "../../../middlewares/errorHandler.ts";
import { conflict } from "../../../errors/appError.ts";

const resOf = () => {
  const res: any = {
    headersSent: false,
    statusCode: 0,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(body: any) {
      this.body = body;
      return this;
    },
  };
  return res;
};

const reqOf = () => ({
  id: "req-1",
  user: null,
  log: { error: jest.fn(), warn: jest.fn() },
});

describe("errorHandler", () => {
  it("AppError conserva status, code y mensaje seguro", () => {
    const res = resOf();
    errorHandler(conflict("Conflict"), reqOf(), res, jest.fn());
    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe("CONFLICT");
    expect(res.body.errorId).toBeDefined();
  });

  it("error desconocido → 500 genérico", () => {
    const res = resOf();
    errorHandler(new Error("patient John Doe HIV"), reqOf(), res, jest.fn());
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Internal server error");
    expect(JSON.stringify(res.body)).not.toContain("John Doe");
  });

  it("body-parser entity.parse.failed → 400 BAD_REQUEST", () => {
    const res = resOf();
    const err = Object.assign(new SyntaxError("Unexpected token"), {
      type: "entity.parse.failed",
      status: 400,
      expose: true,
    });
    errorHandler(err, reqOf(), res, jest.fn());
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("BAD_REQUEST");
  });
});
