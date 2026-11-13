import { describe, it, expect, jest } from "@jest/globals";
import { createShutdownRunner } from "../../config/shutdown.ts";

describe("shutdown", () => {
  it("cierra en orden y una sola vez", async () => {
    const calls: string[] = [];

    const apollo = {
      stop: jest.fn(async () => {
        calls.push("apollo");
      }),
    };

    const http = {
      listening: true,
      close: (cb: (err?: Error) => void) => {
        calls.push("http");
        cb();
      },
      closeIdleConnections: jest.fn(),
    };

    const exit = jest.fn();

    const runner = createShutdownRunner({
      getApollo: () => apollo,
      getHttp: () => http as any,
      closeMongo: async () => {
        calls.push("mongo");
      },
      quitRedis: async () => {
        calls.push("redis");
      },
      stopTelemetry: async () => {
        calls.push("telemetry");
      },
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
        flush: (cb: () => void) => cb(),
      } as any,
      timeoutMs: 1000,
      exit,
    });

    await runner("SIGTERM", 0);
    await runner("SIGTERM", 0); // idempotente

    expect(calls).toEqual(["apollo", "http", "mongo", "redis", "telemetry"]);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });
});
