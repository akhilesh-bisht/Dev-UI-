import dotenv from "dotenv";
import ConnectDb from "./db/db.js";
import { app } from "./app.js";

dotenv.config();
const PORT = process.env.PORT || 3500;
const startServer = async () => {
  try {
    await ConnectDb();
    const server = app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });

    server.on("error", (err) => {
      console.error(" Server error:", err);
      process.exit(1);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
