import request from "supertest";
import mongoose from "mongoose";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from "@jest/globals";
import { createServer } from "../../app.ts";
import { closeTestDB, connectTestDB } from "./setup.ts";
import { lifecycle } from "../../config/lifecycle.ts";

let httpServer: any;
let apolloServer: any;

const setReadyState = (value: number) => {
  // readyState es un accessor del prototipo. Lo sombreamos con una propiedad
  // propia escribible para poder restaurarlo correctamente.
  Object.defineProperty(mongoose.connection, "readyState", {
    value,
    configurable: true,
    writable: true,
  });
};

const restoreReadyState = () => {
  // Al borrar la propiedad propia vuelve el accessor get/set del prototipo.
  delete (mongoose.connection as any).readyState;
};

beforeAll(async () => {
  await connectTestDB();
  ({ httpServer, apolloServer } = await createServer());
});

afterEach(() => {
  restoreReadyState();
  lifecycle.shuttingDown = false;
});

afterAll(async () => {
  (global as any).__TEST_TEAR_DOWN__ = true;
  await apolloServer.stop();
  await closeTestDB();
  await new Promise((resolve) => httpServer.close(resolve));
});

describe("health", () => {
  it("liveness no consulta dependencias", async () => {
    setReadyState(0);
    const res = await request(httpServer).get("/api/health/live");
    expect(res.status).toBe(200);
  });

  it("readiness devuelve 503 si Mongo está down", async () => {
    setReadyState(0);
    const res = await request(httpServer).get("/api/health/ready");
    expect(res.status).toBe(503);
    expect(res.body.checks.mongo.status).toBe("down");
  });

  it("readiness devuelve 503 durante draining", async () => {
    lifecycle.shuttingDown = true;
    const res = await request(httpServer).get("/api/health/ready");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("draining");
  });
});
