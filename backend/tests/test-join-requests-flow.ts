import express from "express";
import { db } from "../src/db";
import { sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import joinRequestsRoutes from "../src/routes/join-requests";
import http from "http";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Setup express app with join requests routes
const app = express();
app.use(express.json());
app.use("/api/company/join-requests", joinRequestsRoutes);

async function createTestUser(email: string, fullName: string) {
  const userIdRes = await db.execute(sql`SELECT gen_random_uuid() as id`);
  const id = userIdRes.rows[0].id as string;

  await db.execute(sql`
    INSERT INTO auth.users (
      id, instance_id, email, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, email_confirmed_at
    ) VALUES (
      ${id}, '00000000-0000-0000-0000-000000000000', ${email}, 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now(), now()
    )
  `);

  await db.execute(sql`
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (${id}, ${email}, ${fullName}, now(), now())
    ON CONFLICT (id) DO UPDATE SET email = ${email}, full_name = ${fullName}
  `);

  return { id, email, fullName };
}

async function cleanupTestUser(id: string) {
  await db.execute(sql`DELETE FROM notifications WHERE recipient_id = ${id}`);
  await db.execute(sql`DELETE FROM company_members WHERE profile_id = ${id}`);
  await db.execute(sql`DELETE FROM company_join_requests WHERE profile_id = ${id}`);
  await db.execute(sql`DELETE FROM profile_roles WHERE profile_id = ${id}`);
  await db.execute(sql`DELETE FROM profiles WHERE id = ${id}`);
  await db.execute(sql`DELETE FROM auth.users WHERE id = ${id}`);
}

async function runTests() {
  console.log("=== MEMULAI PENGUJIAN FITUR PERMINTAAN BERGABUNG ===");

  // Start ephemeral server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}/api/company/join-requests`;

  let applicant1: { id: string; email: string; fullName: string } | null = null;
  let applicant2: { id: string; email: string; fullName: string } | null = null;
  let req1Id: string | null = null;
  let req2Id: string | null = null;

  try {
    console.log("\n[Setup] Menyiapkan data uji...");
    
    // Find an owner or admin user and their company
    const ownerRes = await db.execute(sql`
      SELECT cm.company_id, cm.profile_id, cm.role, p.email, c.name as company_name
      FROM company_members cm
      JOIN profiles p ON p.id = cm.profile_id
      JOIN companies c ON c.id = cm.company_id
      WHERE cm.role IN ('owner', 'admin') AND cm.status = 'active' AND cm.deleted_at IS NULL
      LIMIT 1
    `);

    if (ownerRes.rows.length === 0) {
      throw new Error("Tidak ditemukan perusahaan dengan owner/admin aktif di database");
    }

    const testAdmin = ownerRes.rows[0];
    const companyId = testAdmin.company_id as string;
    const adminId = testAdmin.profile_id as string;
    const adminEmail = testAdmin.email as string;

    console.log(`Perusahaan Uji: ${testAdmin.company_name} (${companyId})`);
    console.log(`Admin Uji: ${adminEmail} (${adminId})`);

    // Find a member without management rights
    const memberRes = await db.execute(sql`
      SELECT cm.profile_id, p.email
      FROM company_members cm
      JOIN profiles p ON p.id = cm.profile_id
      WHERE cm.role = 'member' AND cm.status = 'active' AND cm.deleted_at IS NULL
      LIMIT 1
    `);

    let memberId: string;
    let memberEmail: string;

    if (memberRes.rows.length > 0) {
      memberId = memberRes.rows[0].profile_id as string;
      memberEmail = memberRes.rows[0].email as string;
    } else {
      const anyProfile = await db.execute(sql`
        SELECT id, email FROM profiles WHERE id != ${adminId} LIMIT 1
      `);
      memberId = anyProfile.rows[0].id as string;
      memberEmail = anyProfile.rows[0].email as string;
    }

    console.log(`Pengguna Tanpa Hak Akses (Member): ${memberEmail} (${memberId})`);

    // Create 2 test applicants
    const rand = Math.floor(Math.random() * 100000);
    applicant1 = await createTestUser(`app1-${rand}@test-absenin.local`, "Pemohon Terima Test");
    applicant2 = await createTestUser(`app2-${rand}@test-absenin.local`, "Pemohon Tolak Test");

    console.log(`Applicant 1: ${applicant1.email} (${applicant1.id})`);
    console.log(`Applicant 2: ${applicant2.email} (${applicant2.id})`);

    // Create 2 pending join requests:
    // Request 1: for "Terima"
    // Request 2: for "Tolak"
    const req1Res = await db.execute(sql`
      INSERT INTO company_join_requests (id, profile_id, company_id, status, created_by, created_at, updated_at)
      VALUES (gen_random_uuid(), ${applicant1.id}, ${companyId}, 'pending', ${applicant1.id}, now(), now())
      RETURNING id, status
    `);
    req1Id = req1Res.rows[0].id as string;

    const req2Res = await db.execute(sql`
      INSERT INTO company_join_requests (id, profile_id, company_id, status, created_by, created_at, updated_at)
      VALUES (gen_random_uuid(), ${applicant2.id}, ${companyId}, 'pending', ${applicant2.id}, now(), now())
      RETURNING id, status
    `);
    req2Id = req2Res.rows[0].id as string;

    console.log(`Request 1 (Skenario Terima): ${req1Id}`);
    console.log(`Request 2 (Skenario Tolak): ${req2Id}`);

    // Generate JWT Tokens
    const adminToken = jwt.sign({ sub: adminId, email: adminEmail }, JWT_SECRET, { expiresIn: "1h" });
    const memberToken = jwt.sign({ sub: memberId, email: memberEmail }, JWT_SECRET, { expiresIn: "1h" });

    // =========================================================================
    // UJI 1: Pengguna tanpa hak akses tidak dapat menerima atau menolak permintaan
    // =========================================================================
    console.log("\n[Uji 1] Pengguna tanpa hak akses tidak dapat menerima atau menolak permintaan...");
    
    // 1a. Member biasa mencoba approve
    const unauthApproveRes = await fetch(`${baseUrl}/${req1Id}/approve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${memberToken}`,
        "x-company-id": companyId,
      },
    });
    console.log(`- Member biasa POST /approve: HTTP ${unauthApproveRes.status} (Harus 403)`);
    if (unauthApproveRes.status !== 403) {
      throw new Error(`Uji 1a Gagal: Diharapkan HTTP 403, didapat ${unauthApproveRes.status}`);
    }

    // 1b. Member biasa mencoba reject
    const unauthRejectRes = await fetch(`${baseUrl}/${req2Id}/reject`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${memberToken}`,
        "x-company-id": companyId,
      },
    });
    console.log(`- Member biasa POST /reject: HTTP ${unauthRejectRes.status} (Harus 403)`);
    if (unauthRejectRes.status !== 403) {
      throw new Error(`Uji 1b Gagal: Diharapkan HTTP 403, didapat ${unauthRejectRes.status}`);
    }

    // 1c. Tanpa token
    const noTokenRes = await fetch(`${baseUrl}/${req2Id}/reject`, {
      method: "POST",
    });
    console.log(`- Tanpa token POST /reject: HTTP ${noTokenRes.status} (Harus 401)`);
    if (noTokenRes.status !== 401) {
      throw new Error(`Uji 1c Gagal: Diharapkan HTTP 401, didapat ${noTokenRes.status}`);
    }
    console.log("✔ SUKSES: Pengguna tanpa hak akses ditolak dengan benar (403/401).");

    // =========================================================================
    // UJI 2: Permintaan Menunggu dapat diterima
    // =========================================================================
    console.log("\n[Uji 2] Permintaan Menunggu dapat diterima...");
    const approveRes = await fetch(`${baseUrl}/${req1Id}/approve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "x-company-id": companyId,
      },
    });
    const approveData = await approveRes.json();
    console.log(`- Admin POST /approve: HTTP ${approveRes.status}`, approveData);
    if (approveRes.status !== 200 || !approveData.success) {
      throw new Error(`Uji 2 Gagal: ${approveData.message || "Gagal approve request"}`);
    }

    // Verify DB state for approved request
    const checkReq1 = await db.execute(sql`
      SELECT status, reviewed_by FROM company_join_requests WHERE id = ${req1Id}
    `);
    console.log(`- Status Request 1 di DB: '${checkReq1.rows[0]?.status}' (Harus 'approved')`);
    if (checkReq1.rows[0]?.status !== "approved") {
      throw new Error("Uji 2 Gagal: Status di database bukan 'approved'");
    }

    // Verify member active in company_members
    const checkMember1 = await db.execute(sql`
      SELECT status, role FROM company_members WHERE company_id = ${companyId} AND profile_id = ${applicant1.id}
    `);
    console.log(`- Status Anggota Applicant 1 di DB: '${checkMember1.rows[0]?.status}', Role: '${checkMember1.rows[0]?.role}'`);
    if (checkMember1.rows[0]?.status !== "active") {
      throw new Error("Uji 2 Gagal: Anggota tidak aktif setelah disetujui");
    }

    // Verify notification sent
    const notifApproveRes = await db.execute(sql`
      SELECT id, type, title, message FROM notifications
      WHERE recipient_id = ${applicant1.id} AND reference_id = ${req1Id}
      LIMIT 1
    `);
    console.log(`- Notifikasi Approve: Type='${notifApproveRes.rows[0]?.type}'`);
    if (notifApproveRes.rows[0]?.type !== "JOIN_REQUEST_APPROVED") {
      throw new Error("Uji 2 Gagal: Notifikasi JOIN_REQUEST_APPROVED tidak ditemukan");
    }
    console.log("✔ SUKSES: Permintaan Menunggu berhasil diterima dan keanggotaan aktif dibuat.");

    // =========================================================================
    // UJI 3: Permintaan Menunggu dapat ditolak
    // =========================================================================
    console.log("\n[Uji 3] Permintaan Menunggu dapat ditolak...");
    const rejectRes = await fetch(`${baseUrl}/${req2Id}/reject`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "x-company-id": companyId,
      },
    });
    const rejectData = await rejectRes.json();
    console.log(`- Admin POST /reject: HTTP ${rejectRes.status}`, rejectData);
    if (rejectRes.status !== 200 || !rejectData.success) {
      throw new Error(`Uji 3 Gagal: ${rejectData.message || "Gagal reject request"}`);
    }

    // Verify DB state for rejected request
    const checkReq2 = await db.execute(sql`
      SELECT status, reviewed_by FROM company_join_requests WHERE id = ${req2Id}
    `);
    console.log(`- Status Request 2 di DB: '${checkReq2.rows[0]?.status}' (Harus 'rejected')`);
    if (checkReq2.rows[0]?.status !== "rejected") {
      throw new Error("Uji 3 Gagal: Status di database bukan 'rejected'");
    }
    console.log("✔ SUKSES: Permintaan Menunggu berhasil ditolak dengan status 'rejected'.");

    // =========================================================================
    // UJI 4: Permintaan yang ditolak tidak menjadi anggota aktif perusahaan
    // =========================================================================
    console.log("\n[Uji 4] Permintaan yang ditolak tidak menjadi anggota aktif perusahaan...");
    const checkMember2 = await db.execute(sql`
      SELECT status FROM company_members WHERE company_id = ${companyId} AND profile_id = ${applicant2.id}
    `);
    const isMember2Active = checkMember2.rows.length > 0 && checkMember2.rows[0].status === "active";
    console.log(`- Keanggotaan aktif Applicant 2 di company_members: ${isMember2Active ? "AKTIF (SALAH!)" : "TIDAK AKTIF (BENAR)"}`);
    if (isMember2Active) {
      throw new Error("Uji 4 Gagal: Pengaju yang ditolak tercatat sebagai anggota aktif");
    }

    const checkProfile2 = await db.execute(sql`
      SELECT company_id FROM profiles WHERE id = ${applicant2.id}
    `);
    console.log(`- profiles.company_id Applicant 2: ${checkProfile2.rows[0]?.company_id || "NULL (BENAR)"}`);
    if (checkProfile2.rows[0]?.company_id === companyId) {
      throw new Error("Uji 4 Gagal: profiles.company_id masih terhubung ke perusahaan");
    }
    console.log("✔ SUKSES: Pengaju yang ditolak tidak memiliki keanggotaan aktif di perusahaan.");

    // =========================================================================
    // UJI 5: Pengaju menerima notifikasi penolakan jika didukung sistem saat ini
    // =========================================================================
    console.log("\n[Uji 5] Pengaju menerima notifikasi penolakan...");
    const notifRejectRes = await db.execute(sql`
      SELECT id, type, title, message, reference_id
      FROM notifications
      WHERE recipient_id = ${applicant2.id} AND reference_id = ${req2Id}
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (notifRejectRes.rows.length === 0) {
      throw new Error("Uji 5 Gagal: Tidak ada notifikasi yang ditemukan untuk pemohon yang ditolak");
    }

    const notif = notifRejectRes.rows[0];
    console.log(`- Notifikasi Diterima: Type='${notif.type}', Title='${notif.title}'`);
    console.log(`- Pesan Notifikasi: '${notif.message}'`);
    if (notif.type !== "JOIN_REQUEST_REJECTED") {
      throw new Error(`Uji 5 Gagal: Tipe notifikasi bukan JOIN_REQUEST_REJECTED (didapat: ${notif.type})`);
    }
    console.log("✔ SUKSES: Pengaju menerima notifikasi penolakan JOIN_REQUEST_REJECTED.");

    // =========================================================================
    // UJI 6: Permintaan yang sudah diproses tidak dapat diproses ulang
    // =========================================================================
    console.log("\n[Uji 6] Permintaan yang sudah diproses tidak dapat diproses ulang...");

    // 6a. Coba approve lagi Request 1 (sudah approved)
    const reApprove1 = await fetch(`${baseUrl}/${req1Id}/approve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "x-company-id": companyId,
      },
    });
    const reApprove1Data = await reApprove1.json();
    console.log(`- Approve ulang Request 1: HTTP ${reApprove1.status}`, reApprove1Data);
    if (reApprove1.status !== 400 || reApprove1Data.message !== "Request ini sudah diproses sebelumnya") {
      throw new Error("Uji 6a Gagal: Backend tidak memblokir approval ulang");
    }

    // 6b. Coba reject Request 1 (sudah approved)
    const rejectApproved1 = await fetch(`${baseUrl}/${req1Id}/reject`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "x-company-id": companyId,
      },
    });
    const rejectApproved1Data = await rejectApproved1.json();
    console.log(`- Reject Request 1 yang sudah disetujui: HTTP ${rejectApproved1.status}`, rejectApproved1Data);
    if (rejectApproved1.status !== 400 || rejectApproved1Data.message !== "Request ini sudah diproses sebelumnya") {
      throw new Error("Uji 6b Gagal: Backend tidak memblokir reject pada request yang sudah approved");
    }

    // 6c. Coba reject lagi Request 2 (sudah rejected)
    const reReject2 = await fetch(`${baseUrl}/${req2Id}/reject`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "x-company-id": companyId,
      },
    });
    const reReject2Data = await reReject2.json();
    console.log(`- Reject ulang Request 2: HTTP ${reReject2.status}`, reReject2Data);
    if (reReject2.status !== 400 || reReject2Data.message !== "Request ini sudah diproses sebelumnya") {
      throw new Error("Uji 6c Gagal: Backend tidak memblokir rejection ulang");
    }

    // 6d. Coba approve Request 2 (sudah rejected)
    const approveRejected2 = await fetch(`${baseUrl}/${req2Id}/approve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "x-company-id": companyId,
      },
    });
    const approveRejected2Data = await approveRejected2.json();
    console.log(`- Approve Request 2 yang sudah ditolak: HTTP ${approveRejected2.status}`, approveRejected2Data);
    if (approveRejected2.status !== 400 || approveRejected2Data.message !== "Request ini sudah diproses sebelumnya") {
      throw new Error("Uji 6d Gagal: Backend tidak memblokir approve pada request yang sudah rejected");
    }

    console.log("✔ SUKSES: Permintaan yang sudah diproses dipastikan tidak dapat diproses ulang.");

    // Cleanup test data
    console.log("\n[Cleanup] Membersihkan data uji...");
    if (req1Id && req2Id) {
      await db.execute(sql`DELETE FROM notifications WHERE reference_id IN (${req1Id}, ${req2Id})`);
      await db.execute(sql`DELETE FROM company_join_requests WHERE id IN (${req1Id}, ${req2Id})`);
    }
    if (applicant1) await cleanupTestUser(applicant1.id);
    if (applicant2) await cleanupTestUser(applicant2.id);

    console.log("\n========================================================");
    console.log("SEMUA 6 SKENARIO PENGUJIAN BERHASIL 100%!");
    console.log("========================================================");

  } catch (error) {
    console.error("\n❌ PENGUJIAN GAGAL:", error);
    process.exitCode = 1;
  } finally {
    if (applicant1) await cleanupTestUser(applicant1.id).catch(() => {});
    if (applicant2) await cleanupTestUser(applicant2.id).catch(() => {});
    server.close();
    process.exit(process.exitCode || 0);
  }
}

runTests();
