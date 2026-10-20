import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import express from "express";
import authRoutes from "../src/routes/auth";
import companiesRoutes from "../src/routes/companies";
import dashboardRoutes from "../src/routes/dashboard";
import joinRequestsRoutes from "../src/routes/join-requests";
import exitRequestsRoutes from "../src/routes/exit-requests";
import profileRoutes from "../src/routes/profile";
import newsRoutes from "../src/routes/news";
import agendasRoutes from "../src/routes/agendas";
import attendancesRoutes from "../src/routes/attendances";
import leavesRoutes from "../src/routes/leaves";
import tasksRoutes from "../src/routes/tasks";
import notificationsRoutes from "../src/routes/notifications";

dotenv.config();

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET is missing");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/company/join-requests", joinRequestsRoutes);
app.use("/api/company/exit-requests", exitRequestsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/agendas", agendasRoutes);
app.use("/api/attendances", attendancesRoutes);
app.use("/api/leaves", leavesRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/notifications", notificationsRoutes);

function createToken(profileId: string, email: string) {
  return jwt.sign(
    { sub: profileId, email, role: "authenticated" },
    secret as string,
    { expiresIn: "1h" }
  );
}

interface MeasureResult {
  endpoint: string;
  status: number;
  timeColdMs: number;
  timeWarmMs: number;
  sizeBytes: number;
  itemCount: number;
  error?: string;
}

async function measureEndpoint(
  path: string,
  token: string,
  companyId: string
): Promise<MeasureResult> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "x-company-id": companyId
  };

  // Cold call
  const startCold = performance.now();
  const resCold = await fetch(`http://127.0.0.1:4568${path}`, { headers });
  const timeColdMs = Math.round((performance.now() - startCold) * 10) / 10;
  const textCold = await resCold.text();
  const sizeBytes = Buffer.byteLength(textCold, "utf8");

  // Warm call
  const startWarm = performance.now();
  const resWarm = await fetch(`http://127.0.0.1:4568${path}`, { headers });
  const timeWarmMs = Math.round((performance.now() - startWarm) * 10) / 10;

  let parsed: any = null;
  try {
    parsed = JSON.parse(textCold);
  } catch {}

  let itemCount = 0;
  if (Array.isArray(parsed)) itemCount = parsed.length;
  else if (Array.isArray(parsed?.data)) itemCount = parsed.data.length;
  else if (parsed?.data && typeof parsed.data === "object") itemCount = Object.keys(parsed.data).length;

  return {
    endpoint: path,
    status: resCold.status,
    timeColdMs,
    timeWarmMs,
    sizeBytes,
    itemCount,
    error: resCold.ok ? undefined : textCold.slice(0, 100)
  };
}

async function runBenchmark() {
  const server = app.listen(4568);
  console.log("=== ABSENIN API PERFORMANCE BENCHMARK ===\n");

  const companyId = "e93c532b-e52d-4486-a556-2d84838414d0";
  const tokenEmployee = createToken("5c59fdd5-d5d1-48c0-961f-76d7892a546a", "ervinaanakbaik@gmail.com");
  const tokenAdmin = createToken("2cd58086-e794-4a4e-8f57-66a7539402be", "dumpme1105@gmail.com");

  const endpointsToTest: { path: string; token: string; desc: string }[] = [
    // Dashboard endpoints
    { path: "/api/auth/me", token: tokenEmployee, desc: "User session & roles" },
    { path: "/api/news?limit=2", token: tokenEmployee, desc: "Dashboard latest news" },
    { path: "/api/attendances/today", token: tokenEmployee, desc: "Today attendance status" },
    { path: "/api/notifications/unread-count", token: tokenEmployee, desc: "Unread count" },
    { path: "/api/tasks", token: tokenEmployee, desc: "Tasks list" },
    { path: "/api/agendas", token: tokenEmployee, desc: "Agendas list" },

    // Admin Dashboard endpoints
    { path: "/api/companies/me", token: tokenAdmin, desc: "Company info & member count" },
    { path: "/api/dashboard/attendance-stats?month=10&year=2026", token: tokenAdmin, desc: "Admin attendance stats" },
    { path: "/api/dashboard/leave-stats", token: tokenAdmin, desc: "Admin leave stats" },
    { path: "/api/notifications", token: tokenAdmin, desc: "Notifications list (activity)" },
    { path: "/api/dashboard/badge-counts", token: tokenAdmin, desc: "Admin badge counts" },

    // Kehadiran & Laporan
    { path: "/api/attendances?limit=10&offset=0", token: tokenEmployee, desc: "Employee attendance history" },
    { path: "/api/attendances/management/summary?month=10&year=2026", token: tokenAdmin, desc: "Admin attendance summary" },

    // Izin & Admin Izin
    { path: "/api/leaves?limit=10&offset=0", token: tokenEmployee, desc: "Employee leave list" },
    { path: "/api/leaves/admin?limit=10&offset=0", token: tokenAdmin, desc: "Admin leave list" },

    // Agenda & Categories
    { path: "/api/agendas/categories", token: tokenEmployee, desc: "Agenda categories" },

    // Berita & Categories
    { path: "/api/news/categories", token: tokenEmployee, desc: "News categories" },
    { path: "/api/news?limit=10&offset=0", token: tokenEmployee, desc: "Paginated news list" },

    // Admin Karyawan & Members
    { path: "/api/companies/employees?limit=10&offset=0", token: tokenAdmin, desc: "Admin employees list" },
    { path: "/api/companies/members", token: tokenAdmin, desc: "Company members (mention/assignee)" },
    { path: "/api/company/exit-requests?limit=10&offset=0", token: tokenAdmin, desc: "Admin exit requests" },
    { path: "/api/company/join-requests?limit=10&offset=0", token: tokenAdmin, desc: "Admin join requests" },
  ];

  const results: MeasureResult[] = [];

  for (const item of endpointsToTest) {
    const res = await measureEndpoint(item.path, item.token, companyId);
    results.push(res);
    console.log(
      `[${res.status}] ${item.desc.padEnd(32)} | Cold: ${String(res.timeColdMs + "ms").padStart(8)} | Warm: ${String(res.timeWarmMs + "ms").padStart(8)} | Size: ${String(res.sizeBytes + "B").padStart(7)} | Items: ${res.itemCount}`
    );
    if (res.error) {
      console.log(`   ERROR: ${res.error}`);
    }
  }

  console.log("\n=== SUMMARY TABLE (MARKDOWN FORMAT) ===");
  console.log("| Endpoint | Deskripsi | Status | Cold (ms) | Warm (ms) | Payload Size | Items |");
  console.log("|---|---|---|---|---|---|---|");
  for (let i = 0; i < endpointsToTest.length; i++) {
    const ep = endpointsToTest[i];
    const r = results[i];
    console.log(`| \`${r.endpoint}\` | ${ep.desc} | ${r.status} | ${r.timeColdMs}ms | ${r.timeWarmMs}ms | ${(r.sizeBytes / 1024).toFixed(2)} KB | ${r.itemCount} |`);
  }

  server.close();
}

runBenchmark().catch(console.error);
