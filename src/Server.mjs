import "dotenv/config";
import { app } from "./app.mjs";
import { connectDb } from "./Config/db.mjs";

const port = Number.parseInt(process.env.PORT || "3000", 10);
if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error("PORT must be a valid TCP port");

try {
    await connectDb();
    app.listen(port, () => console.log(`The server is running on port ${port}`));
} catch (error) {
    console.error("Server failed to start");
    process.exit(1);
}
