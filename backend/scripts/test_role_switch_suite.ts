import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import jwt from "jsonwebtoken";
import express from "express";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

import authRoutes from "../src/routes/auth";
import companiesRoutes from "../src/routes/companies";
import dashboardRoutes from "../src/routes/dashboard";
import attendancesRoutes from "../src/routes/attendances";
import newsRoutes from "../src/routes/news";
import tasksRoutes from "../src/routes/tasks";
import agendasRoutes from "../src/routes/agendas";
import notificationsRoutes from "../src/routes/notifications";
import leavesRoutes from "../src/routes/leaves";

const JWT_SECRET = process.env.JWT_SECRET || "absenin-super-secret-key-123456";

function createToken(sub: string, email: string) {
  return jwt.sign({ sub, email }, JWT_SECRET, { expiresIn: "1h" });
}

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean, extraInfo?: any) {
  if (condition) {
    console.log(`  [PASS] ${description}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${description}`, extraInfo !== undefined ? extraInfo : "");
    failed++;
  }
}

async function runTestSuite() {
  console.log("===================================================================");
  console.log("      ABSENIN MULTI-ROLE & ROLE SWITCH INTEGRATION TEST SUITE      ");
  console.log("===================================================================\n");

  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/companies", companiesRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/attendances", attendancesRoutes);
  app.use("/api/news", newsRoutes);
  app.use("/api/tasks", tasksRoutes);
  app.use("/api/agendas", agendasRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/leaves", leavesRoutes);

  const PORT = 3999;
  const server = app.listen(PORT);
  const baseUrl = `http://localhost:${PORT}/api`;

  const req = async (path: string, options: { token?: string; companyId?: string; role?: string; method?: string; body?: any } = {}) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options.token) headers["Authorization"] = `Bearer ${options.token}`;
    if (options.companyId) headers["x-company-id"] = options.companyId;
    if (options.role) headers["x-role"] = options.role;

    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const status = res.status;
    let data = null;
    try {
      data = await res.json();
    } catch {}
    return { status, data };
  };

  try {
    // 1. Fetch test subjects from database
    // Subject A: Admin in company 1, member in company 2
    const adminUserRes = await db.execute(sql`
      SELECT p.id, p.email, cm.company_id, cm.role as cm_role, c.name as company_name
      FROM profiles p
      JOIN company_members cm ON cm.profile_id = p.id AND cm.status = 'active' AND cm.deleted_at IS NULL
      JOIN companies c ON c.id = cm.company_id
      WHERE cm.role IN ('admin', 'owner')
      LIMIT 1
    `);
    const adminUser = adminUserRes.rows[0] as any;

    // Subject B: Member only (pure employee without admin roles)
    const employeeUserRes = await db.execute(sql`
      SELECT p.id, p.email, cm.company_id, cm.role as cm_role, c.name as company_name
      FROM profiles p
      JOIN company_members cm ON cm.profile_id = p.id AND cm.status = 'active' AND cm.deleted_at IS NULL
      JOIN companies c ON c.id = cm.company_id
      WHERE cm.role = 'member'
        AND NOT EXISTS (
          SELECT 1 FROM profile_roles pr 
          WHERE pr.profile_id = p.id AND pr.role IN ('Admin', 'Manager')
        )
      LIMIT 1
    `);
    const employeeUser = employeeUserRes.rows[0] as any;

    console.log(`Test Subject 1 (Admin/Owner): ${adminUser?.email} in company ${adminUser?.company_name} (${adminUser?.cm_role})`);
    console.log(`Test Subject 2 (Employee): ${employeeUser?.email} in company ${employeeUser?.company_name} (${employeeUser?.cm_role})\n`);

    const adminToken = createToken(adminUser.id, adminUser.email);
    const employeeToken = createToken(employeeUser.id, employeeUser.email);

    // =========================================================================
    // SCENARIO 1: Admin acts as Management Role (Admin/Owner)
    // =========================================================================
    console.log("--- SCENARIO 1: Admin switches to Management role (Admin/Owner) ---");
    const s1Res = await req("/companies/me", {
      token: adminToken,
      companyId: adminUser.company_id,
      role: adminUser.cm_role
    });
    assert("Management role receives company profile successfully (HTTP 200)", s1Res.status === 200);
    assert("Company data returned correctly", s1Res.data?.data?.id === adminUser.company_id);

    // =========================================================================
    // SCENARIO 2: Admin switches to Employee mode (x-role: member)
    // =========================================================================
    console.log("\n--- SCENARIO 2: Admin switches to Employee mode (Mode Personal / Karyawan) ---");
    const s2Res = await req("/leaves/admin", {
      token: adminToken,
      companyId: adminUser.company_id,
      role: "member"
    });
    assert("When active role is 'member', admin leaves management endpoint is forbidden (HTTP 403)", s2Res.status === 403);

    // =========================================================================
    // SCENARIO 3: Permanent DB membership preserved after role switch
    // =========================================================================
    console.log("\n--- SCENARIO 3: Permanent DB membership preserved in database ---");
    const dbCheckRes = await db.execute(sql`
      SELECT role FROM company_members 
      WHERE profile_id = ${adminUser.id} AND company_id = ${adminUser.company_id} AND status = 'active'
    `);
    const preservedRole = dbCheckRes.rows[0]?.role;
    assert("Database company_members role is NOT altered or downgraded", preservedRole === adminUser.cm_role);

    // =========================================================================
    // SCENARIO 4: Switch back to Management role succeeds
    // =========================================================================
    console.log("\n--- SCENARIO 4: Switch back to Management role restores management access ---");
    const s4Res = await req("/leaves/admin", {
      token: adminToken,
      companyId: adminUser.company_id,
      role: adminUser.cm_role
    });
    assert("Switching back to management role allows admin access (HTTP 200)", s4Res.status === 200);

    // =========================================================================
    // SCENARIO 5: Tampered / Unauthorized privilege escalation blocked
    // =========================================================================
    console.log("\n--- SCENARIO 5: Unauthorized role elevation is rejected by backend ---");
    const forgedAdminRes = await req("/leaves/admin", {
      token: employeeToken,
      companyId: employeeUser.company_id,
      role: "admin"
    });
    assert("Forged x-role: admin by a member is rejected (HTTP 403)", forgedAdminRes.status === 403);

    const forgedOwnerRes = await req("/companies/me", {
      token: employeeToken,
      companyId: employeeUser.company_id,
      role: "owner"
    });
    // /companies/me allows reading for company members, but verify resolved role did not escalate
    const forgedMe = await req("/auth/me", {
      token: employeeToken,
      companyId: employeeUser.company_id,
      role: "owner"
    });
    const forgedUser = forgedMe.data?.data?.user;
    assert("Employee /auth/me does NOT adopt forged owner role as permanent permission", 
      !forgedUser?.roles?.includes("Owner") && forgedUser?.activeRole !== "owner"
    );

    // =========================================================================
    // SCENARIO 6: Multi-company tenant switching with role scoping
    // =========================================================================
    console.log("\n--- SCENARIO 6: Multi-company tenant switching with role scoping ---");
    const multiCompUserRes = await db.execute(sql`
      SELECT p.id, p.email,
             json_agg(json_build_object('company_id', cm.company_id, 'role', cm.role)) as memberships
      FROM profiles p
      JOIN company_members cm ON cm.profile_id = p.id AND cm.status = 'active' AND cm.deleted_at IS NULL
      GROUP BY p.id, p.email
      HAVING COUNT(DISTINCT cm.company_id) > 1
      LIMIT 1
    `);
    if (multiCompUserRes.rows.length > 0) {
      const mcUser = multiCompUserRes.rows[0] as any;
      const mcMemberships = mcUser.memberships as any[];
      const comp1 = mcMemberships[0];
      const comp2 = mcMemberships[1];
      const mcToken = createToken(mcUser.id, mcUser.email);

      const comp1Res = await req("/companies/me", {
        token: mcToken,
        companyId: comp1.company_id,
        role: comp1.role
      });
      assert(`Access to Company 1 (${comp1.company_id}) matches company profile`, comp1Res.data?.data?.id === comp1.company_id);

      const comp2Res = await req("/companies/me", {
        token: mcToken,
        companyId: comp2.company_id,
        role: comp2.role
      });
      assert(`Access to Company 2 (${comp2.company_id}) switches cleanly without bleed`, comp2Res.data?.data?.id === comp2.company_id);
    } else {
      console.log("  [SKIP] Multi-company user not found in DB.");
    }

    // =========================================================================
    // SCENARIO 7: Persistence simulation (scoped x-role header on subsequent calls)
    // =========================================================================
    console.log("\n--- SCENARIO 7: Client storage persistence simulation ---");
    // Simulate F5 refresh: client reads stored activeRole_companyId and sends it in x-role
    const refreshRes = await req("/companies/me", {
      token: adminToken,
      companyId: adminUser.company_id,
      role: adminUser.cm_role
    });
    assert("Subsequent request with persisted role succeeds seamlessly (HTTP 200)", refreshRes.status === 200);

    // =========================================================================
    // SCENARIO 8: /auth/me returns all authorized roles (multi-role preserved)
    // =========================================================================
    console.log("\n--- SCENARIO 8: /auth/me preserves all authorized roles during role switch ---");
    const meWithMemberRole = await req("/auth/me", {
      token: adminToken,
      companyId: adminUser.company_id,
      role: "member"
    });
    assert("/auth/me succeeds with x-role: member (HTTP 200)", meWithMemberRole.status === 200);
    const returnedUser = meWithMemberRole.data?.data?.user;
    const returnedRoles = returnedUser?.roles || [];
    assert("Active role returned is 'member'", returnedUser?.activeRole === "member");
    assert("Authorized roles array contains management role even when activeRole is 'member'", 
      returnedRoles.includes("Admin") || returnedRoles.includes("Owner") || returnedRoles.includes("Manager")
    );

    // =========================================================================
    // SCENARIO 9: Concurrent / parallel requests with mixed roles (no thread bleed)
    // =========================================================================
    console.log("\n--- SCENARIO 9: Rapid concurrent requests with mixed roles ---");
    const concurrentPromises = [
      req("/leaves/admin", { token: adminToken, companyId: adminUser.company_id, role: adminUser.cm_role }),
      req("/leaves/admin", { token: adminToken, companyId: adminUser.company_id, role: "member" }),
      req("/leaves/admin", { token: adminToken, companyId: adminUser.company_id, role: adminUser.cm_role }),
      req("/leaves/admin", { token: adminToken, companyId: adminUser.company_id, role: "member" }),
      req("/leaves/admin", { token: adminToken, companyId: adminUser.company_id, role: adminUser.cm_role }),
    ];
    const concurrentResults = await Promise.all(concurrentPromises);
    const statuses = concurrentResults.map(r => r.status);
    console.log("  Concurrent statuses:", statuses);
    assert("Concurrent admin requests succeeded (HTTP 200) and member requests rejected (HTTP 403)",
      statuses[0] === 200 &&
      statuses[1] === 403 &&
      statuses[2] === 200 &&
      statuses[3] === 403 &&
      statuses[4] === 200
    );

  } catch (err) {
    console.error("Test execution failed with error:", err);
  } finally {
    server.close();
    console.log("\n===================================================================");
    console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("===================================================================\n");
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTestSuite();
