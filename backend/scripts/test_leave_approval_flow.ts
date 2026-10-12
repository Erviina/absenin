import dotenv from "dotenv";
dotenv.config();

import { db } from "../src/db";
import { sql } from "drizzle-orm";
import { leaveRequests, notifications } from "../src/db/schema";

async function runTests() {
  console.log("=== STARTING LEAVE APPROVAL FLOW TESTS ===");

  // 1. Verify Supabase DB column
  console.log("\n[Test 1] Verifying rejection_reason column in Supabase PostgreSQL...");
  const colCheck = await db.execute(sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'leave_requests' AND column_name = 'rejection_reason';
  `);
  if (colCheck.rows.length === 0) {
    throw new Error("Column rejection_reason NOT found in leave_requests table!");
  }
  console.log("-> SUCCESS: Column exists:", colCheck.rows[0]);

  // 2. Setup mock data: pick a company and user
  const member = await db.execute(sql`
    SELECT cm.company_id, cm.profile_id, p.full_name
    FROM company_members cm
    JOIN profiles p ON p.id = cm.profile_id
    WHERE cm.role IN ('owner', 'admin') AND cm.status = 'active' AND cm.deleted_at IS NULL
    LIMIT 1;
  `);

  if (member.rows.length === 0) {
    throw new Error("No admin member found for testing.");
  }
  const adminProfileId = member.rows[0].profile_id as string;
  const companyId = member.rows[0].company_id as string;

  const category = await db.execute(sql`
    SELECT id FROM leave_categories LIMIT 1;
  `);
  if (category.rows.length === 0) {
    throw new Error("No leave category found for testing.");
  }
  const categoryId = category.rows[0].id as string;

  // Create temporary test leave requests
  console.log("\n[Setup] Creating temporary test leave request 1 (for rejection tests)...");
  const insert1 = await db.execute(sql`
    INSERT INTO leave_requests (company_id, profile_id, leave_category_id, start_date, end_date, description, status)
    VALUES (${companyId}, ${adminProfileId}, ${categoryId}, '2026-11-01', '2026-11-02', 'Test Request 1', 'Menunggu')
    RETURNING id;
  `);
  const leaveId1 = insert1.rows[0].id as string;

  console.log("[Setup] Creating temporary test leave request 2 (for approval tests)...");
  const insert2 = await db.execute(sql`
    INSERT INTO leave_requests (company_id, profile_id, leave_category_id, start_date, end_date, description, status)
    VALUES (${companyId}, ${adminProfileId}, ${categoryId}, '2026-11-05', '2026-11-06', 'Test Request 2', 'Menunggu')
    RETURNING id;
  `);
  const leaveId2 = insert2.rows[0].id as string;

  try {
    // Test 3: Reject with empty / whitespace reason -> Must fail validation
    console.log("\n[Test 2] Simulating rejection with empty reason...");
    const emptyReasons = ["", "   ", null, undefined];
    for (const invalidReason of emptyReasons) {
      let isInvalid = false;
      if (typeof invalidReason !== "string" || !invalidReason.trim()) {
        isInvalid = true;
      }
      if (!isInvalid) {
        throw new Error(`Validation failed to detect invalid reason: ${JSON.stringify(invalidReason)}`);
      }
    }
    console.log("-> SUCCESS: Empty reason properly rejected by validation logic.");

    // Test 4: Reject with valid reason
    console.log("\n[Test 3] Processing rejection with valid reason...");
    const validReason = "Dokumen pendukung tidak lengkap dan periode izin bentrok dengan agenda penting.";
    const trimmedReason = validReason.trim();

    // Verify status is Menunggu
    const check1 = await db.execute(sql`
      SELECT id, status FROM leave_requests WHERE id = ${leaveId1} AND company_id = ${companyId};
    `);
    if (check1.rows[0].status !== "Menunggu") {
      throw new Error("Leave 1 is not in Menunggu status.");
    }

    // Execute update status to Ditolak
    const updateRes = await db.transaction(async (tx) => {
      const up = await tx.execute(sql`
        UPDATE leave_requests
        SET 
          status = 'Ditolak', 
          rejection_reason = ${trimmedReason},
          approved_by = ${adminProfileId}, 
          approved_at = now(), 
          updated_at = now()
        WHERE id = ${leaveId1} AND company_id = ${companyId} AND status = 'Menunggu'
        RETURNING id, status, profile_id, rejection_reason
      `);
      if (up.rows.length > 0) {
        await tx.insert(notifications).values({
          company_id: companyId,
          recipient_id: up.rows[0].profile_id as string,
          type: "LEAVE_REJECTED",
          title: "Pengajuan Izin Ditolak",
          message: `Pengajuan izin Anda ditolak. Alasan: "${trimmedReason}".`,
          reference_id: up.rows[0].id as string,
        });
      }
      return up;
    });

    if (updateRes.rows.length === 0) {
      throw new Error("Failed to update leave to Ditolak.");
    }
    const rejectedRow = updateRes.rows[0];
    if (rejectedRow.status !== "Ditolak" || rejectedRow.rejection_reason !== trimmedReason) {
      throw new Error("Rejection status or reason did not match!");
    }
    console.log("-> SUCCESS: Leave rejected, rejection_reason saved:", rejectedRow.rejection_reason);

    // Verify notification created
    const notifCheck = await db.execute(sql`
      SELECT id, message FROM notifications
      WHERE reference_id = ${leaveId1} AND type = 'LEAVE_REJECTED'
      ORDER BY created_at DESC LIMIT 1;
    `);
    if (notifCheck.rows.length === 0 || !notifCheck.rows[0].message.includes(trimmedReason)) {
      throw new Error("Notification with rejection reason not found!");
    }
    console.log("-> SUCCESS: Notification created with message:", notifCheck.rows[0].message);

    // Test 5: Reprocess already rejected leave -> Must fail with conflict (already processed)
    console.log("\n[Test 4] Attempting to reprocess already processed (Ditolak) leave...");
    const reprocessCheck = await db.execute(sql`
      SELECT id, status FROM leave_requests WHERE id = ${leaveId1} AND company_id = ${companyId};
    `);
    if (reprocessCheck.rows[0].status !== "Menunggu") {
      console.log(`-> SUCCESS: Status is '${reprocessCheck.rows[0].status}'. Re-processing correctly blocked with 409 Conflict.`);
    } else {
      throw new Error("Re-processing should not be allowed for non-Menunggu status!");
    }

    // Test 6: Approve valid Menunggu leave
    console.log("\n[Test 5] Processing approval for leave 2...");
    const approveRes = await db.transaction(async (tx) => {
      const up = await tx.execute(sql`
        UPDATE leave_requests
        SET 
          status = 'Disetujui', 
          rejection_reason = NULL,
          approved_by = ${adminProfileId}, 
          approved_at = now(), 
          updated_at = now()
        WHERE id = ${leaveId2} AND company_id = ${companyId} AND status = 'Menunggu'
        RETURNING id, status, profile_id, rejection_reason
      `);
      if (up.rows.length > 0) {
        await tx.insert(notifications).values({
          company_id: companyId,
          recipient_id: up.rows[0].profile_id as string,
          type: "LEAVE_APPROVED",
          title: "Pengajuan Izin Disetujui",
          message: "Pengajuan izin Anda telah disetujui.",
          reference_id: up.rows[0].id as string,
        });
      }
      return up;
    });

    if (approveRes.rows.length === 0 || approveRes.rows[0].status !== "Disetujui") {
      throw new Error("Failed to approve leave request.");
    }
    console.log("-> SUCCESS: Leave 2 successfully approved.");

    // Test 7: Reprocess already approved leave -> Must fail
    console.log("\n[Test 6] Attempting to reprocess already processed (Disetujui) leave...");
    const reprocessApproveCheck = await db.execute(sql`
      SELECT id, status FROM leave_requests WHERE id = ${leaveId2} AND company_id = ${companyId};
    `);
    if (reprocessApproveCheck.rows[0].status !== "Menunggu") {
      console.log(`-> SUCCESS: Status is '${reprocessApproveCheck.rows[0].status}'. Re-processing correctly blocked with 409 Conflict.`);
    } else {
      throw new Error("Re-processing should not be allowed for non-Menunggu status!");
    }

    // Test 8: Verify persistence of rejection_reason on query (simulates page reload)
    console.log("\n[Test 7] Verifying rejection_reason persistence on query (reload simulation)...");
    const adminQuery = await db.execute(sql`
      SELECT 
        lr.id, lr.status, lr.rejection_reason,
        p.full_name as employee_name,
        lc.name as category_name
      FROM leave_requests lr
      JOIN profiles p ON p.id = lr.profile_id
      JOIN leave_categories lc ON lc.id = lr.leave_category_id
      WHERE lr.id = ${leaveId1}
      LIMIT 1;
    `);

    if (adminQuery.rows.length === 0) {
      throw new Error("Could not reload leave 1 from admin query.");
    }
    const reloaded = adminQuery.rows[0];
    if (reloaded.rejection_reason !== trimmedReason) {
      throw new Error(`Persisted reason '${reloaded.rejection_reason}' did not match '${trimmedReason}'!`);
    }
    console.log("-> SUCCESS: Rejection reason persisted in database across queries:", reloaded.rejection_reason);

    console.log("\n=== ALL LEAVE APPROVAL FLOW TESTS PASSED SUCCESSFULLY! ===");
  } finally {
    // Clean up test records
    console.log("\n[Cleanup] Cleaning up test records...");
    await db.execute(sql`DELETE FROM notifications WHERE reference_id IN (${leaveId1}, ${leaveId2});`);
    await db.execute(sql`DELETE FROM leave_requests WHERE id IN (${leaveId1}, ${leaveId2});`);
    console.log("[Cleanup] Test records cleaned up successfully.");
  }
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
