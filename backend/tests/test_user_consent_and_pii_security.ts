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
  console.log("==================================================================");
  console.log("=== AUTOMATED TEST SUITE: USER CONSENT & PII ACCESS RESTRICTION ===");
  console.log("==================================================================\n");

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
  app.get("/api/health", async (req, res) => {
    res.status(200).json({ status: "ok", message: "Server is healthy", db_connection: "success" });
  });


  const TEST_PORT = 3995;
  const server = app.listen(TEST_PORT);
  const baseUrl = `http://localhost:${TEST_PORT}/api`;

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, detail?: any) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`, detail || "");
      failed++;
    }
  }

  async function req(path: string, options: { method?: string; token?: string; body?: any; companyId?: string } = {}) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (options.token) {
      headers["Authorization"] = `Bearer ${options.token}`;
    }
    if (options.companyId) {
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
    } catch {}
    return { status: res.status, body: json };
  }

  try {
    // 1. Ambil data entity untuk pengujian
    const membersRes = await db.execute(sql`
      SELECT cm.company_id, c.name as company_name, cm.profile_id, cm.role, p.email, p.full_name
      FROM company_members cm
      JOIN companies c ON c.id = cm.company_id
      JOIN profiles p ON p.id = cm.profile_id
      WHERE cm.status = 'active' AND cm.deleted_at IS NULL
      ORDER BY cm.company_id, cm.role
    `);

    const members = membersRes.rows as any[];
    const ownerMember = members.find((m) => m.role === "owner" || m.role === "admin");
    const regularMemberA = members.find((m) => m.role === "member" && m.company_id === ownerMember?.company_id);
    const regularMemberB = members.find((m) => m.profile_id !== regularMemberA?.profile_id && m.profile_id !== ownerMember?.profile_id)
      || members.find((m) => m.profile_id !== regularMemberA?.profile_id);

    if (!ownerMember || !regularMemberA) {
      throw new Error("Kandidat pengguna untuk pengujian tidak ditemukan di database.");
    }

    const tokenOwner = createToken(ownerMember.profile_id, ownerMember.email);
    const tokenUserA = createToken(regularMemberA.profile_id, regularMemberA.email);
    const tokenUserB = regularMemberB ? createToken(regularMemberB.profile_id, regularMemberB.email) : null;

    console.log("Entitas pengujian:");
    console.log("- Admin/Owner:", ownerMember.email, "(ID:", ownerMember.profile_id, ")");
    console.log("- User A (Regular):", regularMemberA.email, "(ID:", regularMemberA.profile_id, ")");
    if (regularMemberB) {
      console.log("- User B (Regular):", regularMemberB.email, "(ID:", regularMemberB.profile_id, ")\n");
    }

    // =========================================================================
    // SKENARIO 1: Checkbox persetujuan wajib dicentang sebelum proses dilanjutkan
    // =========================================================================
    console.log("--- SKENARIO 1: Validasi Persetujuan Wajib (Checkbox Consent) ---");
    const s1_falseConsent = await req("/auth/consent", {
      method: "POST",
      token: tokenUserA,
      body: { consent_accepted: false },
    });
    assert("POST /api/auth/consent ditolak jika consent_accepted bernilai false (HTTP 400)", s1_falseConsent.status === 400);

    const s1_emptyConsent = await req("/auth/consent", {
      method: "POST",
      token: tokenUserA,
      body: {},
    });
    assert("POST /api/auth/consent ditolak jika payload consent kosong (HTTP 400)", s1_emptyConsent.status === 400);

    const s1_unregisteredConsent = await req("/auth/google", {
      method: "POST",
      body: {
        idToken: "invalid_dummy_token_without_consent",
      },
    });
    assert("POST /api/auth/google tanpa token atau consent ditolak server-side (HTTP 400/401)", s1_unregisteredConsent.status === 400 || s1_unregisteredConsent.status === 401);

    // =========================================================================
    // SKENARIO 2: Persetujuan yang sah tersimpan dengan benar dan dapat diperiksa
    // =========================================================================
    console.log("\n--- SKENARIO 2: Penyimpanan & Pemeriksaan Persetujuan Sah (v1.0) ---");
    const s2_saveConsent = await req("/auth/consent", {
      method: "POST",
      token: tokenUserA,
      body: { consent_accepted: true, policy_version: "v1.0" },
    });
    assert("Persetujuan yang sah berhasil dicatat (HTTP 200)", s2_saveConsent.status === 200 && s2_saveConsent.body?.success === true);
    assert("Versi kebijakan yang dicatat sesuai ('v1.0')", s2_saveConsent.body?.data?.policyVersion === "v1.0");

    const s2_checkConsent = await req("/auth/consent", {
      method: "GET",
      token: tokenUserA,
    });
    assert("GET /api/auth/consent mengonfirmasi status hasConsented = true", s2_checkConsent.status === 200 && s2_checkConsent.body?.data?.hasConsented === true);

    const s2_checkHistory = await req("/auth/consent/history", {
      method: "GET",
      token: tokenUserA,
    });
    assert("GET /api/auth/consent/history mengembalikan riwayat audit persetujuan", s2_checkHistory.status === 200 && Array.isArray(s2_checkHistory.body?.data) && s2_checkHistory.body.data.length > 0);

    const s2_meConsent = await req("/auth/me", {
      method: "GET",
      token: tokenUserA,
      companyId: regularMemberA.company_id,
    });
    assert("GET /api/auth/me menyertakan metadata consent pengguna", s2_meConsent.status === 200 && s2_meConsent.body?.data?.user?.consent?.hasConsented === true);

    // =========================================================================
    // SKENARIO 3: Pengguna tanpa autentikasi tidak dapat mengakses endpoint terlindungi
    // =========================================================================
    console.log("\n--- SKENARIO 3: Perlindungan Autentikasi (HTTP 401 Unauthorized) ---");
    const s3_profile = await req("/profile");
    assert("GET /api/profile tanpa token ditolak (HTTP 401)", s3_profile.status === 401);

    const s3_attendances = await req("/attendances");
    assert("GET /api/attendances tanpa token ditolak (HTTP 401)", s3_attendances.status === 401);

    const s3_leaves = await req("/leaves");
    assert("GET /api/leaves tanpa token ditolak (HTTP 401)", s3_leaves.status === 401);

    const s3_tasks = await req("/tasks");
    assert("GET /api/tasks tanpa token ditolak (HTTP 401)", s3_tasks.status === 401);

    const s3_notifications = await req("/notifications");
    assert("GET /api/notifications tanpa token ditolak (HTTP 401)", s3_notifications.status === 401);

    const s3_consent = await req("/auth/consent");
    assert("GET /api/auth/consent tanpa token ditolak (HTTP 401)", s3_consent.status === 401);

    // =========================================================================
    // SKENARIO 4: Pengguna A tidak dapat membaca data pribadi Pengguna B (IDOR)
    // =========================================================================
    console.log("\n--- SKENARIO 4: Pembatasan Akses Lintas Pengguna (IDOR Prevention Read) ---");
    // Cari absensi milik pengguna lain
    const otherAttRes = await db.execute(sql`
      SELECT id, profile_id FROM attendances
      WHERE profile_id != ${regularMemberA.profile_id} AND deleted_at IS NULL
      LIMIT 1
    `);
    if (otherAttRes.rows.length > 0) {
      const otherAttId = otherAttRes.rows[0].id;
      const s4_att = await req(`/attendances/${otherAttId}`, {
        token: tokenUserA,
        companyId: regularMemberA.company_id,
      });
      assert("Pengguna A tidak dapat membaca detail presensi Pengguna B (HTTP 403/404)", s4_att.status === 403 || s4_att.status === 404);
    } else {
      console.log("[SKIP] Tidak ada data presensi pengguna lain untuk uji presensi.");
    }

    // Cari permohonan izin milik pengguna lain
    const otherLeaveRes = await db.execute(sql`
      SELECT id, profile_id FROM leave_requests
      WHERE profile_id != ${regularMemberA.profile_id} AND deleted_at IS NULL
      LIMIT 1
    `);
    if (otherLeaveRes.rows.length > 0) {
      const otherLeaveId = otherLeaveRes.rows[0].id;
      const s4_leave = await req(`/leaves/${otherLeaveId}`, {
        token: tokenUserA,
        companyId: regularMemberA.company_id,
      });
      assert("Pengguna A tidak dapat membaca detail izin Pengguna B (HTTP 403/404)", s4_leave.status === 403 || s4_leave.status === 404);
    } else {
      console.log("[SKIP] Tidak ada data izin pengguna lain untuk uji permohonan izin.");
    }

    // Buat tugas personal milik User B (atau ambil yang sudah ada)
    if (regularMemberB && tokenUserB) {
      const createPersonalTaskRes = await req("/tasks", {
        method: "POST",
        token: tokenUserB,
        companyId: regularMemberB.company_id,
        body: {
          title: "Catatan Rahasia User B",
          type: "personal",
          note: "Hanya untuk User B",
        },
      });

      if (createPersonalTaskRes.status === 201 && createPersonalTaskRes.body?.id) {
        const userBTaskId = createPersonalTaskRes.body.id;
        const s4_task = await req(`/tasks/${userBTaskId}`, {
          token: tokenUserA,
          companyId: regularMemberA.company_id,
        });
        assert("Pengguna A tidak dapat membaca tugas personal milik Pengguna B (HTTP 403/404)", s4_task.status === 403 || s4_task.status === 404);

        // =========================================================================
        // SKENARIO 5: Pengguna A tidak dapat mengubah data Pengguna B tanpa izin
        // =========================================================================
        console.log("\n--- SKENARIO 5: Pencegahan Mutasi Tidak Sah (IDOR Mutate Prevention) ---");
        const s5_taskPatch = await req(`/tasks/${userBTaskId}`, {
          method: "PATCH",
          token: tokenUserA,
          companyId: regularMemberA.company_id,
          body: { title: "Hacked by User A" },
        });
        assert("Pengguna A tidak dapat mengubah tugas personal Pengguna B (HTTP 403)", s5_taskPatch.status === 403);

        const s5_taskDelete = await req(`/tasks/${userBTaskId}`, {
          method: "DELETE",
          token: tokenUserA,
          companyId: regularMemberA.company_id,
        });
        assert("Pengguna A tidak dapat menghapus tugas personal Pengguna B (HTTP 403)", s5_taskDelete.status === 403);
      }
    }

    // Pengguna A mencoba mengubah status izin orang lain
    if (otherLeaveRes.rows.length > 0) {
      const otherLeaveId = otherLeaveRes.rows[0].id;
      const s5_leaveStatus = await req(`/leaves/${otherLeaveId}/status`, {
        method: "PUT",
        token: tokenUserA,
        companyId: regularMemberA.company_id,
        body: { status: "Disetujui" },
      });
      assert("Pengguna biasa tidak dapat menyetujui/mengubah status izin (HTTP 403)", s5_leaveStatus.status === 403);
    }

    // Pengguna A mencoba mengubah role karyawan lain
    const s5_roles = await req(`/companies/employees/${ownerMember.profile_id}/roles`, {
      method: "PATCH",
      token: tokenUserA,
      companyId: regularMemberA.company_id,
      body: { roles: ["Employee", "Admin"] },
    });
    assert("Pengguna biasa tidak dapat memodifikasi peran/role karyawan (HTTP 403)", s5_roles.status === 403);

    // =========================================================================
    // SKENARIO 6: Pengguna dapat mengakses data miliknya sesuai kewenangan
    // =========================================================================
    console.log("\n--- SKENARIO 6: Akses Sah terhadap Data Milik Sendiri ---");
    const s6_me = await req("/auth/me", { token: tokenUserA, companyId: regularMemberA.company_id });
    assert("Pengguna dapat mengakses data profil diri melalui /auth/me (HTTP 200)", s6_me.status === 200 && s6_me.body?.data?.user?.id === regularMemberA.profile_id);

    const s6_profile = await req("/profile", { token: tokenUserA });
    assert("Pengguna dapat mengakses data profil diri melalui /profile (HTTP 200)", s6_profile.status === 200 && s6_profile.body?.data?.id === regularMemberA.profile_id);

    const s6_attendances = await req("/attendances", { token: tokenUserA, companyId: regularMemberA.company_id });
    assert("Pengguna dapat mengakses riwayat presensi miliknya sendiri (HTTP 200)", s6_attendances.status === 200);

    const s6_leaves = await req("/leaves", { token: tokenUserA, companyId: regularMemberA.company_id });
    assert("Pengguna dapat mengakses riwayat izin miliknya sendiri (HTTP 200)", s6_leaves.status === 200);

    const s6_notifications = await req("/notifications", { token: tokenUserA });
    assert("Pengguna dapat mengakses daftar notifikasi miliknya (HTTP 200)", s6_notifications.status === 200);

    // =========================================================================
    // SKENARIO 7: Role administratif dapat mengakses data sesuai izin yang ditetapkan
    // =========================================================================
    console.log("\n--- SKENARIO 7: Otorisasi Berdasarkan Role (Admin vs Employee) ---");
    const s7_empList_admin = await req("/companies/employees", { token: tokenOwner, companyId: ownerMember.company_id });
    assert("Admin/Owner DAPAT mengakses daftar karyawan perusahaan (HTTP 200)", s7_empList_admin.status === 200);

    const s7_empList_member = await req("/companies/employees", { token: tokenUserA, companyId: regularMemberA.company_id });
    assert("Karyawan biasa DITOLAK dari daftar karyawan perusahaan (HTTP 403)", s7_empList_member.status === 403);

    const s7_dashboard_admin = await req("/dashboard/attendance-stats", { token: tokenOwner, companyId: ownerMember.company_id });
    assert("Admin/Owner DAPAT mengakses statistik kehadiran dashboard (HTTP 200)", s7_dashboard_admin.status === 200);

    const s7_dashboard_member = await req("/dashboard/attendance-stats", { token: tokenUserA, companyId: regularMemberA.company_id });
    assert("Karyawan biasa DITOLAK dari statistik kehadiran dashboard (HTTP 403)", s7_dashboard_member.status === 403);

    const s7_leavesAdmin_admin = await req("/leaves/admin", { token: tokenOwner, companyId: ownerMember.company_id });
    assert("Admin/Owner DAPAT mengakses daftar pengajuan izin administratif (HTTP 200)", s7_leavesAdmin_admin.status === 200);

    const s7_leavesAdmin_member = await req("/leaves/admin", { token: tokenUserA, companyId: regularMemberA.company_id });
    assert("Karyawan biasa DITOLAK dari daftar pengajuan izin administratif (HTTP 403)", s7_leavesAdmin_member.status === 403);

    // =========================================================================
    // SKENARIO 8: Endpoint yang ditolak tidak membocorkan informasi pribadi
    // =========================================================================
    console.log("\n--- SKENARIO 8: Pencegahan Kebocoran PII pada Pesan Error ---");
    const s8_response = s7_empList_member;
    const bodyStr = JSON.stringify(s8_response.body || "");
    const leaksSensitiveField = bodyStr.includes("password") || bodyStr.includes("token") || bodyStr.includes("secret") || bodyStr.includes("stack");
    assert("Respons error 403 tidak membocorkan kredensial, token rahasia, atau stack trace", !leaksSensitiveField);

    // =========================================================================
    // SKENARIO 9: Perubahan tidak merusak fitur dan alur yang sudah tersedia
    // =========================================================================
    console.log("\n--- SKENARIO 9: Kompatibilitas Alur Aplikasi yang Sudah Ada ---");
    const s9_health = await req("/health");
    assert("Health check endpoint berfungsi normal (HTTP 200)", s9_health.status === 200);

    const s9_leaveCategories = await req("/leaves/categories");
    assert("Kategori izin dapat diakses publik/terautentikasi (HTTP 200)", s9_leaveCategories.status === 200 && Array.isArray(s9_leaveCategories.body?.data));

    const s9_todayAtt = await req("/attendances/today", { token: tokenUserA, companyId: regularMemberA.company_id });
    assert("Endpoint /attendances/today berfungsi lancar (HTTP 200)", s9_todayAtt.status === 200 && s9_todayAtt.body?.data?.status);

    console.log("\n==================================================================");
    console.log(`HASIL AKHIR: TOTAL SKENARIO: ${passed + failed} | BERHASIL: ${passed} | GAGAL: ${failed}`);
    console.log("==================================================================\n");

  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
