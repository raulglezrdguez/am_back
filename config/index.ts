import dotenv from "dotenv";
dotenv.config();

const { MONGO_URI, NODE_ENV, JWT_SECRET } = process.env;
const PORT = process.env.NODE_ENV === "test" ? 0 : process.env.PORT || 5050;
export { MONGO_URI, NODE_ENV, PORT, JWT_SECRET };
