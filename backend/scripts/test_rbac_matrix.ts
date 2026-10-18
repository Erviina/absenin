import dotenv from "dotenv";
dotenv.config();

import jwt from "jsonwebtoken";
import { db } from "../src/db";
import { sql } from "drizzle-orm";
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

const JWT_SECRET = process.env.JWT_SECRET || "absenin-super-secret-key-123456";

function createToken(sub: string, email: string) {
  return jwt.sign({ sub, email }, JWT_SECRET, { expiresIn: "1h" });
}

async function runTests() {
  console.log("=== STARTING COMPREHENSIVE RE-AUDIT RBAC & IDOR TEST SUITE ===\n");

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

  const server = app.listen(3997);
  const baseUrl = "http://localhost:3997/api";

  try {
    const membersRes = await db.execute(sql`
      SELECT cm.company_id, c.name as company_name, cm.profile_id, cm.role, p.email, p.full_name
      FROM company_members cm
      JOIN companies c ON c.id = cm.company_id
      JOIN profiles p ON p.id = cm.profile_id
      WHERE cm.status = 'active' AND cm.deleted_at IS NULL
      ORDER BY cm.company_id, cm.role
    `);

    const members = membersRes.rows as any[];
    console.log(`Found ${members.length} active company memberships in database.`);

    const ownerMember = members.find((m) => m.role === "owner");
    const regularMember = members.find((m) => m.role === "member" && m.company_id === ownerMember?.company_id) 
      || members.find((m) => m.role === "member");
    const managerMember = members.find((m) => m.role === "manager");

    if (!ownerMember || !regularMember) {
      throw new Error("Could not find owner or regular member to test with");
    }

    console.log("Test Entities Selected:");
    console.log("1. Owner / Admin:", { email: ownerMember.email, role: ownerMember.role, company: ownerMember.company_id });
    console.log("2. Regular Member:", { email: regularMember.email, role: regularMember.role, company: regularMember.company_id });
    if (managerMember) {
      console.log("3. Manager:", { email: managerMember.email, role: managerMember.role, company: managerMember.company_id });
    }

    const ownerToken = createToken(ownerMember.profile_id, ownerMember.email);
    const memberToken = createToken(regularMember.profile_id, regularMember.email);
    const managerToken = managerMember ? createToken(managerMember.profile_id, managerMember.email) : null;

    let passedCount = 0;
    let failedCount = 0;

    function assert(testName: string, condition: boolean, detail?: any) {
      if (condition) {
        console.log(`[PASS] ${testName}`);
        passedCount++;
      } else {
        console.error(`[FAIL] ${testName}`, detail || "");
        failedCount++;
      }
    }

    async function req(path: string, options: { method?: string; token?: string; body?: any; companyId?: string }) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (options.token) {
        headers["Authorization"] = `Bearer ${options.token}`;
      }
      if (options.companyId !== undefined) {
        headers["x-company-id"] = options.companyId;
      }
      const res = await fetch(`${baseUrl}${path}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      let json: any = null;
      try {
        json = await res.json();
      } catch (e) {}
      return { status: res.status, body: json };
    }

    // =========================================================================
    // FOCUS 1: Company Switching & Tenant Resolution
    // =========================================================================
    console.log("\n--- FOCUS 1: Company Switching & Tenant Resolution ---");
    // Default fallback when no header sent
    const f1_noHeader = await req("/auth/me", { token: memberToken });
    assert("Request without company header resolves default active company (200)", f1_noHeader.status === 200);

    // Explicit valid company header
    const f1_validHeader = await req("/auth/me", { token: memberToken, companyId: regularMember.company_id });
    assert("Request with valid company header resolves correctly (200)", f1_validHeader.status === 200 && f1_validHeader.body?.data?.user?.company?.id === regularMember.company_id);

    // Foreign company header rejection
    const foreignCompany = members.find((m) => m.company_id !== regularMember.company_id);
    if (foreignCompany) {
      const f1_foreign = await req("/news", { token: memberToken, companyId: foreignCompany.company_id });
      assert("Request to company where user is NOT an active member is REJECTED (403/404)", f1_foreign.status === 403 || f1_foreign.status === 404);
    }

    // Sanitization: string "undefined" should fall back to default company instead of erroring
    const f1_undefHeader = await req("/auth/me", { token: memberToken, companyId: "undefined" });
    assert("Header 'undefined' gracefully falls through to active company (200)", f1_undefHeader.status === 200);

    // =========================================================================
    // FOCUS 2 & 5: Changing Company Data (Admin Only, Manager Forbidden)
    // =========================================================================
    console.log("\n--- FOCUS 2 & 5: Company Modifications (Admin Only, Manager Forbidden) ---");
    const f2_comp_member = await req("/companies/me", {
      method: "PATCH",
      token: memberToken,
      companyId: regularMember.company_id,
      body: { name: "Unauthorized Change" },
    });
    assert("Employee is FORBIDDEN from updating company settings (403)", f2_comp_member.status === 403);

    if (managerMember && managerToken) {
      const f5_comp_mgr = await req("/companies/me", {
        method: "PATCH",
        token: managerToken,
        companyId: managerMember.company_id,
        body: { name: "Manager Unauthorized Change" },
      });
      assert("Manager is FORBIDDEN from updating company settings (403)", f5_comp_mgr.status === 403);

      const f5_loc_mgr = await req("/companies/me", {
        method: "PATCH",
        token: managerToken,
        companyId: managerMember.company_id,
        body: { latitude: "-6.200000", longitude: "106.816666" },
      });
      assert("Manager is FORBIDDEN from changing office location (403)", f5_loc_mgr.status === 403);

      const f5_time_mgr = await req("/companies/me", {
        method: "PATCH",
        token: managerToken,
        companyId: managerMember.company_id,
        body: { work_start_time: "09:00", work_end_time: "18:00" },
      });
      assert("Manager is FORBIDDEN from changing work hours (403)", f5_time_mgr.status === 403);

      const f5_avatar_mgr = await req("/companies/avatar", {
        method: "POST",
        token: managerToken,
        companyId: managerMember.company_id,
      });
      assert("Manager is FORBIDDEN from changing company avatar (403)", f5_avatar_mgr.status === 403);

      const f5_role_mgr = await req(`/companies/employees/${regularMember.profile_id}/roles`, {
        method: "PATCH",
        token: managerToken,
        companyId: managerMember.company_id,
        body: { roles: ["Employee", "Admin"] },
      });
      assert("Manager is FORBIDDEN from modifying employee roles (403)", f5_role_mgr.status === 403);
    }

    // Owner/Admin CAN modify company settings
    const f2_comp_admin = await req("/companies/me", {
      method: "PATCH",
      token: ownerToken,
      companyId: ownerMember.company_id,
      body: { name: ownerMember.company_name },
    });
    assert("Admin/Owner CAN update company settings (200)", f2_comp_admin.status === 200);

    // =========================================================================
    // FOCUS 3 & 4: Employee Forbidden from Management Data
    // =========================================================================
    console.log("\n--- FOCUS 3 & 4: Employee Forbidden from Management Data ---");
    const f4_attStats = await req("/dashboard/attendance-stats", { token: memberToken, companyId: regularMember.company_id });
    assert("Employee CANNOT access /dashboard/attendance-stats (403)", f4_attStats.status === 403);

    const f4_leaveStats = await req("/dashboard/leave-stats", { token: memberToken, companyId: regularMember.company_id });
    assert("Employee CANNOT access /dashboard/leave-stats (403)", f4_leaveStats.status === 403);

    const f4_badges = await req("/dashboard/badge-counts", { token: memberToken, companyId: regularMember.company_id });
    assert("Employee CANNOT access /dashboard/badge-counts (403)", f4_badges.status === 403);

    const f4_activities = await req("/dashboard/activities", { token: memberToken, companyId: regularMember.company_id });
    assert("Employee CANNOT access /dashboard/activities (403)", f4_activities.status === 403);

    const f4_mgmtAttSummary = await req("/attendances/management/summary?month=10&year=2026", { token: memberToken, companyId: regularMember.company_id });
    assert("Employee CANNOT access /attendances/management/summary (403)", f4_mgmtAttSummary.status === 403);

    const f4_mgmtAttEmp = await req(`/attendances/management/employees/${ownerMember.profile_id}`, { token: memberToken, companyId: regularMember.company_id });
    assert("Employee CANNOT access /attendances/management/employees/:id (403)", f4_mgmtAttEmp.status === 403);

    const f4_mgmtAgenda = await req(`/agendas/management/employees/${ownerMember.profile_id}`, { token: memberToken, companyId: regularMember.company_id });
    assert("Employee CANNOT access /agendas/management/employees/:id (403)", f4_mgmtAgenda.status === 403);

    const f4_mgmtTasks = await req(`/tasks/management/employees/${ownerMember.profile_id}`, { token: memberToken, companyId: regularMember.company_id });
    assert("Employee CANNOT access /tasks/management/employees/:id (403)", f4_mgmtTasks.status === 403);

    const f4_employees = await req("/companies/employees", { token: memberToken, companyId: regularMember.company_id });
    assert("Employee CANNOT access /companies/employees (403)", f4_employees.status === 403);

    const f4_leavesAdmin = await req("/leaves/admin", { token: memberToken, companyId: regularMember.company_id });
    assert("Employee CANNOT access /leaves/admin (403)", f4_leavesAdmin.status === 403);

    const f4_joinReqs = await req("/company/join-requests", { token: memberToken, companyId: regularMember.company_id });
    assert("Employee CANNOT access /company/join-requests (403)", f4_joinReqs.status === 403);

    const f4_exitReqs = await req("/company/exit-requests", { token: memberToken, companyId: regularMember.company_id });
    assert("Employee CANNOT access /company/exit-requests (403)", f4_exitReqs.status === 403);

    // =========================================================================
    // FOCUS 6: Hierarchy Checks on Employee Removal
    // =========================================================================
    console.log("\n--- FOCUS 6: Hierarchy Checks on Employee Removal ---");
    if (managerMember && managerToken) {
      // Find an owner or admin in the same company as manager
      const managerCompanyOwner = members.find((m) => m.company_id === managerMember.company_id && (m.role === "owner" || m.role === "admin"));
      if (managerCompanyOwner) {
        const f6_mgr_owner = await req(`/companies/employees/${managerCompanyOwner.profile_id}`, {
          method: "DELETE",
          token: managerToken,
          companyId: managerMember.company_id,
        });
        assert("Manager CANNOT delete Owner/Admin in same company (403)", f6_mgr_owner.status === 403);
      } else {
        const f6_mgr_foreign = await req(`/companies/employees/${ownerMember.profile_id}`, {
          method: "DELETE",
          token: managerToken,
          companyId: managerMember.company_id,
        });
        assert("Manager CANNOT delete user in foreign company (404/403)", f6_mgr_foreign.status === 404 || f6_mgr_foreign.status === 403);
      }

      // Manager attempting to delete self
      const f6_mgr_self = await req(`/companies/employees/${managerMember.profile_id}`, {
        method: "DELETE",
        token: managerToken,
        companyId: managerMember.company_id,
      });
      assert("Manager CANNOT delete self (400)", f6_mgr_self.status === 400);
    }

    // =========================================================================
    // FOCUS 7: Personal Features for Admin / Owner
    // =========================================================================
    console.log("\n--- FOCUS 7: Personal Features for Admin / Owner ---");
    const f7_profile = await req("/auth/me", { token: ownerToken, companyId: ownerMember.company_id });
    assert("Admin/Owner CAN access personal profile /auth/me (200)", f7_profile.status === 200);

    const f7_today = await req("/attendances/today", { token: ownerToken, companyId: ownerMember.company_id });
    assert("Admin/Owner CAN access /attendances/today (200)", f7_today.status === 200);

    const f7_history = await req("/attendances", { token: ownerToken, companyId: ownerMember.company_id });
    assert("Admin/Owner CAN access own attendance history /attendances (200)", f7_history.status === 200);

    const f7_leaves = await req("/leaves", { token: ownerToken, companyId: ownerMember.company_id });
    assert("Admin/Owner CAN access own leave list /leaves (200)", f7_leaves.status === 200);

    // =========================================================================
    // FOCUS 9: IDOR & Tenant Boundary Protection
    // =========================================================================
    console.log("\n--- FOCUS 9: IDOR & Tenant Boundary Protection ---");
    // IDOR on single attendance
    const otherMemberAttendanceRes = await db.execute(sql`
      SELECT id, profile_id FROM attendances
      WHERE profile_id != ${regularMember.profile_id}
      LIMIT 1
    `);
    if (otherMemberAttendanceRes.rows.length > 0) {
      const otherAttId = otherMemberAttendanceRes.rows[0].id;
      const f9_idor_att = await req(`/attendances/${otherAttId}`, {
        token: memberToken,
        companyId: regularMember.company_id,
      });
      assert("Employee accessing other employee's attendance detail is BLOCKED (404/403)", f9_idor_att.status === 404 || f9_idor_att.status === 403);
    }

    console.log("\n==========================================");
    console.log(`TOTAL TESTS: ${passedCount + failedCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
    console.log("==========================================\n");

  } finally {
    server.close();
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
