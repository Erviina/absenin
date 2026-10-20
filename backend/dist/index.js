"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./db");
const drizzle_orm_1 = require("drizzle-orm");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
const auth_1 = __importDefault(require("./routes/auth"));
const companies_1 = __importDefault(require("./routes/companies"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const join_requests_1 = __importDefault(require("./routes/join-requests"));
const exit_requests_1 = __importDefault(require("./routes/exit-requests"));
const profile_1 = __importDefault(require("./routes/profile"));
const news_1 = __importDefault(require("./routes/news"));
const agendas_1 = __importDefault(require("./routes/agendas"));
const attendances_1 = __importDefault(require("./routes/attendances"));
const leaves_1 = __importDefault(require("./routes/leaves"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const platform_1 = __importDefault(require("./routes/platform"));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/auth", auth_1.default);
app.use("/api/platform", platform_1.default);
app.use("/api/companies", companies_1.default);
app.use("/api/dashboard", dashboard_1.default);
app.use("/api/company/join-requests", join_requests_1.default);
app.use("/api/company/exit-requests", exit_requests_1.default);
app.use("/api/profile", profile_1.default);
app.use("/api/news", news_1.default);
app.use("/api/agendas", agendas_1.default);
app.use("/api/attendances", attendances_1.default);
app.use("/api/leaves", leaves_1.default);
app.use("/api/tasks", tasks_1.default);
app.use("/api/notifications", notifications_1.default);
app.get("/api/health", async (req, res) => {
    try {
        // Test database connection
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT 1 as is_alive`);
        res.status(200).json({
            status: "ok",
            message: "Server is healthy",
            db_connection: "success",
        });
    }
    catch (error) {
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
