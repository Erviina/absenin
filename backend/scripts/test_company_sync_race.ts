import dotenv from "dotenv";
dotenv.config();

import jwt from "jsonwebtoken";
import { db } from "../src/db";
import { sql } from "drizzle-orm";
import express from "express";

import authRoutes from "../src/routes/auth";
import companiesRoutes from "../src/routes/companies";
import dashboardRoutes from "../src/routes/dashboard";
import attendancesRoutes from "../src/routes/attendances";
import newsRoutes from "../src/routes/news";
import tasksRoutes from "../src/routes/tasks";
import agendasRoutes from "../src/routes/agendas";
import notificationsRoutes from "../src/routes/notifications";

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

async function runRegressionTests() {
  console.log("===================================================================");
  console.log("  ABSENIN REGRESSION TEST: ACTIVE COMPANY SYNC & RACE CONDITIONS  ");
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

  const PORT = 3998;
  const server = app.listen(PORT);
  const baseUrl = `http://localhost:${PORT}/api`;

  const req = async (path: string, options: { token?: string; companyId?: string; method?: string; body?: any } = {}) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options.token) headers["Authorization"] = `Bearer ${options.token}`;
    if (options.companyId) headers["x-company-id"] = options.companyId;

    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const json = await res.json().catch(() => ({}));
    return { status: res.status, data: json };
  };

  try {
    // 1. Fetch active memberships and companies in the database
    const companiesRes = await db.execute(sql`
      SELECT id, name FROM companies WHERE deleted_at IS NULL LIMIT 5
    `);
    const allCompanies = companiesRes.rows as any[];
    console.log(`Found ${allCompanies.length} companies in DB.`);

    if (allCompanies.length < 1) {
      throw new Error("Need at least 1 company in database to test");
    }

    const membershipsRes = await db.execute(sql`
      SELECT cm.company_id, cm.profile_id, cm.role, p.email, p.full_name
      FROM company_members cm
      JOIN profiles p ON p.id = cm.profile_id
      WHERE cm.status = 'active' AND cm.deleted_at IS NULL
    `);
    const memberships = membershipsRes.rows as any[];
    console.log(`Found ${memberships.length} active memberships in DB.\n`);

    // Group memberships by profile_id to find multi-company users
    const userMembershipsMap = new Map<string, any[]>();
    for (const m of memberships) {
      if (!userMembershipsMap.has(m.profile_id)) {
        userMembershipsMap.set(m.profile_id, []);
      }
      userMembershipsMap.get(m.profile_id)!.push(m);
    }

    let multiCompanyUser: { profile_id: string; email: string; memberships: any[] } | null = null;
    for (const [pid, list] of userMembershipsMap.entries()) {
      if (list.length >= 2) {
        multiCompanyUser = { profile_id: pid, email: list[0].email, memberships: list };
        break;
      }
    }

    // If no existing user has 2+ companies, pick a user and add a temporary active membership to company 2
    let cleanupTemporaryMembership = false;
    let tempCompanyId: string | null = null;
    let testProfileId = memberships[0].profile_id;
    let testEmail = memberships[0].email;
    let compA_id = memberships[0].company_id;
    let compB_id: string = "";

    if (multiCompanyUser) {
      testProfileId = multiCompanyUser.profile_id;
      testEmail = multiCompanyUser.email;
      compA_id = multiCompanyUser.memberships[0].company_id;
      compB_id = multiCompanyUser.memberships[1].company_id;
      console.log(`Found naturally occurring multi-company user: ${testEmail}`);
      console.log(`  - Company A: ${compA_id}`);
      console.log(`  - Company B: ${compB_id}\n`);
    } else if (allCompanies.length >= 2) {
      const secondComp = allCompanies.find((c) => c.id !== compA_id);
      compB_id = secondComp.id;
      tempCompanyId = compB_id;
      cleanupTemporaryMembership = true;

      await db.execute(sql`
        INSERT INTO company_members (id, company_id, profile_id, role, status, joined_at)
        VALUES (gen_random_uuid(), ${compB_id}, ${testProfileId}, 'member', 'active', now())
        ON CONFLICT (company_id, profile_id) DO UPDATE SET status = 'active', deleted_at = NULL
      `);
      console.log(`Setup temporary multi-company membership for testing: ${testEmail}`);
      console.log(`  - Company A: ${compA_id}`);
      console.log(`  - Company B: ${compB_id}\n`);
    } else {
      console.log("Only 1 company exists. Testing single company context & invalid tenant switching.");
    }

    const testToken = createToken(testProfileId, testEmail);

    // TEST SUITE 1: Active Company Header Switching
    console.log("--- TEST SUITE 1: Explicit Header Switching (/auth/me) ---");
    const resA = await req("/auth/me", { token: testToken, companyId: compA_id });
    assert("Request with x-company-id = A returns status 200", resA.status === 200);
    assert(
      "Returned user company ID is Company A",
      resA.data?.data?.user?.company?.id === compA_id,
      { expected: compA_id, got: resA.data?.data?.user?.company?.id }
    );

    if (compB_id) {
      const resB = await req("/auth/me", { token: testToken, companyId: compB_id });
      assert("Switch company: Request with x-company-id = B returns status 200", resB.status === 200);
      assert(
        "Returned user company ID switches immediately to Company B without refresh",
        resB.data?.data?.user?.company?.id === compB_id,
        { expected: compB_id, got: resB.data?.data?.user?.company?.id }
      );

      // Verify DB profiles.company_id was updated to B automatically
      const dbProfile = await db.execute(sql`SELECT company_id FROM profiles WHERE id = ${testProfileId}`);
      assert(
        "Database profiles.company_id was synchronized to Company B",
        dbProfile.rows[0]?.company_id === compB_id,
        { expected: compB_id, got: dbProfile.rows[0]?.company_id }
      );
    }

    // TEST SUITE 2: Concurrent & Out-of-Order Request Simulation
    console.log("\n--- TEST SUITE 2: Concurrent & Out-of-Order Request Simulation ---");
    if (compB_id) {
      // Dispatch request for A and B concurrently
      const [concA, concB] = await Promise.all([
        req("/attendances/today", { token: testToken, companyId: compA_id }),
        req("/attendances/today", { token: testToken, companyId: compB_id })
      ]);

      assert("Concurrent today-attendance for A returns 200", concA.status === 200);
      assert("Concurrent today-attendance for B returns 200", concB.status === 200);

      if (concA.data?.data?.company?.id) {
        assert(
          "Today attendance response for A contains Company A ID",
          concA.data.data.company.id === compA_id
        );
      }
      if (concB.data?.data?.company?.id) {
        assert(
          "Today attendance response for B contains Company B ID",
          concB.data.data.company.id === compB_id
        );
      }
    }

    // TEST SUITE 3: Tenant Scoping on News, Tasks, and Agendas
    console.log("\n--- TEST SUITE 3: Scoped Feeds (News, Tasks, Agendas) ---");
    const newsRes = await req("/news?limit=2", { token: testToken, companyId: compA_id });
    assert("GET /api/news with Company A returns 200", newsRes.status === 200);

    const tasksRes = await req("/tasks", { token: testToken, companyId: compA_id });
    assert("GET /api/tasks with Company A returns 200", tasksRes.status === 200);

    const agendasRes = await req("/agendas", { token: testToken, companyId: compA_id });
    assert("GET /api/agendas with Company A returns 200", agendasRes.status === 200);

    // TEST SUITE 4: Invalid Cross-Tenant Access Protection
    console.log("\n--- TEST SUITE 4: Cross-Tenant Isolation (Non-Member Company) ---");
    const fakeCompanyId = "00000000-0000-0000-0000-000000000000";
    const resForbiddenTenant = await req("/auth/me", { token: testToken, companyId: fakeCompanyId });
    // Backend resolveTenant handles invalid explicit tenant by sanitizing without leaking fake company
    assert(
      "Request with non-member company does NOT return fake company",
      resForbiddenTenant.data?.data?.user?.company?.id !== fakeCompanyId
    );

    // Clean up temporary membership if created
    if (cleanupTemporaryMembership && tempCompanyId) {
      await db.execute(sql`
        DELETE FROM company_members WHERE company_id = ${tempCompanyId} AND profile_id = ${testProfileId}
      `);
      console.log("\nCleaned up temporary test membership successfully.");
    }

  } catch (err: any) {
    console.error("Test error:", err);
    failed++;
  } finally {
    server.close();
  }

  console.log("\n===================================================================");
  console.log(`  REGRESSION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("===================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionTests().catch((e) => {
  console.error("Fatal test failure:", e);
  process.exit(1);
});
