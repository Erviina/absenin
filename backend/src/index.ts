import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db } from "./db";
import { sql } from "drizzle-orm";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

import authRoutes from "./routes/auth";
import companiesRoutes from "./routes/companies";
import dashboardRoutes from "./routes/dashboard";
import joinRequestsRoutes from "./routes/join-requests";
import profileRoutes from "./routes/profile";
import newsRoutes from "./routes/news";

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/company/join-requests", joinRequestsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/news", newsRoutes);

app.get("/api/health", async (req: Request, res: Response) => {
  try {
    // Test database connection
    const result = await db.execute(sql`SELECT 1 as is_alive`);
    res.status(200).json({
      status: "ok",
      message: "Server is healthy",
      db_connection: "success",
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    res.status(500).json({
      status: "error",
      message: "Server is running, but database connection failed",
      db_connection: "failed",
    });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});
