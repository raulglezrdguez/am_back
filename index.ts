import { connectDB } from "./config/db.ts";
import { PORT } from "./config/index.ts";
import { createServer } from "./app.ts";

await connectDB();
const { httpServer } = await createServer();

httpServer.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
});
