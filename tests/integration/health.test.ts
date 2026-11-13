import request from "supertest";
import mongoose from "mongoose";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { createServer } from "../../app.ts";
import { closeTestDB, connectTestDB } from "./setup.ts";
import { lifecycle } from "../../config/lifecycle.ts";

let httpServer: any;
let apolloServer: any;

beforeAll(async () => {
  await connectTestDB();
  ({ httpServer, apolloServer } = await createServer());
});

afterAll(async () => {
  (global as any).__TEST_TEAR_DOWN__ = true;
  await apolloServer.stop();
  await closeTestDB();
  await new Promise((resolve) => httpServer.close(resolve));
});

describe("health", () => {
  it("liveness no consulta dependencias", async () => {
    const original = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, "readyState", {
      value: 0,
      configurable: true,
    });
    const res = await request(httpServer).get("/api/health/live");
    expect(res.status).toBe(200);
    Object.defineProperty(mongoose.connection, "readyState", {
      value: original,
      configurable: true,
    });
  });

  it("readiness devuelve 503 si Mongo está down", async () => {
    const original = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, "readyState", {
      value: 0,
      configurable: true,
    });
    const res = await request(httpServer).get("/api/health/ready");
    expect(res.status).toBe(503);
    expect(res.body.checks.mongo.status).toBe("down");
    Object.defineProperty(mongoose.connection, "readyState", {
      value: original,
      configurable: true,
    });
  });

  it("readiness devuelve 503 durante draining", async () => {
    lifecycle.shuttingDown = true;
    const res = await request(httpServer).get("/api/health/ready");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("draining");
    lifecycle.shuttingDown = false;
  });
});
