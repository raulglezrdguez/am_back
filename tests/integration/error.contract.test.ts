import request from "supertest";
import jwt from "jsonwebtoken";
import {
  beforeAll,
  afterAll,
  afterEach,
  describe,
  it,
  expect,
} from "@jest/globals";
import { createServer } from "../../app.ts";
import User from "../../models/user.model.ts";
import { JWT_SECRET } from "../../config/index.ts";
import { closeTestDB, connectTestDB } from "./setup.ts";

let httpServer: import("http").Server;
let apolloServer: import("@apollo/server").ApolloServer<any>;

beforeAll(async () => {
  await connectTestDB();
  await User.init(); // garantiza el índice unique de email
  ({ httpServer, apolloServer } = await createServer());
});

afterAll(async () => {
  (global as any).__TEST_TEAR_DOWN__ = true;
  await apolloServer.stop();
  await closeTestDB();
  await new Promise((resolve) => httpServer.close(resolve));
});

afterEach(async () => {
  await User.deleteMany({});
});

const gql = (query: string) => ({ query });
const tokenFor = (user: any) =>
  jwt.sign(
    { id: user._id, email: user.email, status: 1, role: user.role },
    JWT_SECRET as string,
  );

describe("contrato de errores GraphQL", () => {
  it("signup duplicado → CONFLICT sin E11000/índice/email", async () => {
    await request(httpServer)
      .post("/graphql")
      .send(
        gql(
          `mutation { signup(input:{name:"Alice",email:"alice@x.com",password:"secret"}){ id } }`,
        ),
      )
      .expect(200);

    const res = await request(httpServer)
      .post("/graphql")
      .send(
        gql(
          `mutation { signup(input:{name:"Alice",email:"alice@x.com",password:"secret"}){ id } }`,
        ),
      )
      .expect(200);

    expect(res.body.errors[0].extensions.code).toBe("CONFLICT");
    expect(res.body.errors[0].extensions.errorId).toBeDefined();
    expect(JSON.stringify(res.body)).not.toMatch(
      /E11000|duplicate key|email_1|alice@x\.com/,
    );
  });

  it("patient(id inválido) → BAD_USER_INPUT sin Cast/ObjectId/Patient", async () => {
    const user = await User.create({
      name: "U",
      email: "u@x.com",
      role: 1,
      status: 1,
    });

    const res = await request(httpServer)
      .post("/graphql")
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send(gql(`{ patient(id:"not-an-objectid"){ _id } }`))
      .expect(200);

    expect(res.body.errors[0].extensions.code).toBe("BAD_USER_INPUT");
  });

  it("patientBy(name:'(') no rompe el regex", async () => {
    const user = await User.create({
      name: "U",
      email: "u2@x.com",
      role: 1,
      status: 1,
    });

    const res = await request(httpServer)
      .post("/graphql")
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send(gql(`{ patientBy(name:"("){ _id } }`))
      .expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.patientBy).toEqual([]);
  });

  it("users sin token → UNAUTHENTICATED", async () => {
    const res = await request(httpServer)
      .post("/graphql")
      .send(gql(`{ users { id } }`))
      .expect(200);

    expect(res.body.errors[0].extensions.code).toBe("UNAUTHENTICATED");
    expect(res.body.errors[0].message).toBe("Authentication required");
  });

  it("JSON malformado → 400 BAD_REQUEST sin stack", async () => {
    const res = await request(httpServer)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send('{"query":')
      .expect(400);

    expect(res.body.code).toBe("BAD_REQUEST");
    expect(res.body.errorId).toBeDefined();
    expect(JSON.stringify(res.body)).not.toMatch(/at |\.ts:|SyntaxError/);
  });

  it("ruta desconocida → 404 NOT_FOUND", async () => {
    const res = await request(httpServer).get("/no-existe").expect(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});
