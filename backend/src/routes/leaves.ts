import express, { Request, Response } from "express";
import { db } from "../db";
import { leaveRequests, leaveCategories, notifications } from "../db/schema";
import { authenticate } from "../middleware/auth";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { resolveTenant } from "../utils/tenant";

const router = express.Router();

// Get all leave categories
router.get("/categories", async (req: Request, res: Response) => {
  try {
    const categories = await db.select().from(leaveCategories).where(sql`deleted_at IS NULL`);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error("Error fetching leave categories:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get user's leave requests with approver info
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenant = await resolveTenant(req, user.id);

    const companyCondition = tenant ? sql`AND (lr.company_id = ${tenant.companyId} OR lr.company_id IS NULL)` : sql``;

    // Fetch leave requests for this user, ordered by created_at desc with approver profile info
    const userLeaves = await db.execute(sql`
      SELECT 
        lr.id,
        lr.profile_id,
        lr.company_id,
        lr.leave_category_id,
        lr.start_date,
        lr.end_date,
        lr.description,
        lr.attachment_url,
        lr.status,
        lr.approved_at,
        lr.approved_by,
        lr.rejection_reason,
        lr.created_at,
        lr.updated_at,
        COALESCE(p_app.full_name, p_app.email) as approver_name,
        p_app.avatar_url as approver_avatar,
        COALESCE(lc.name, 'Lainnya') as category_name
      FROM leave_requests lr
      LEFT JOIN profiles p_app ON p_app.id = lr.approved_by
      LEFT JOIN leave_categories lc ON lc.id = lr.leave_category_id
      WHERE lr.profile_id = ${user.id} 
        AND lr.deleted_at IS NULL
        ${companyCondition}
      ORDER BY lr.created_at DESC
    `);
      
    res.json({ success: true, data: userLeaves.rows });
  } catch (error) {
    console.error("Error fetching user leaves:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Schema for creating a leave request
const createLeaveSchema = z.object({
  leave_category_id: z.string().uuid(),
  start_date: z.string(),
  end_date: z.string(),
  description: z.string().optional(),
  attachment_url: z.string().optional(),
});

// Create a new leave request
router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userAuth = (req as any).user;
    const tenant = await resolveTenant(req, userAuth.id);
    
    if (!tenant) {
      return res.status(400).json({ success: false, message: "User is not assigned to an active company or tenant." });
    }
    const companyId = tenant.companyId;

    // Validate request body
    const validatedData = createLeaveSchema.parse(req.body);

    // Use transaction with transaction-level advisory lock to serialize concurrent submissions and check daily quota
    const txResult = await db.transaction(async (tx) => {
      // 1. Transaction-level advisory lock on (hashtext('leave_requests'), hashtext(userAuth.id || companyId))
      // Serializes concurrent requests from the same user for this company
      await tx.execute(sql`
        SELECT pg_advisory_xact_lock(hashtext('leave_requests'), hashtext(${userAuth.id} || ${companyId}))
      `);

      // 2. Check if user already submitted an active leave request today for THIS company with status 'Menunggu' or 'Disetujui' in Asia/Jakarta timezone
      const existingToday = await tx.execute(sql`
        SELECT id FROM leave_requests
        WHERE profile_id = ${userAuth.id}
          AND company_id = ${companyId}
          AND status IN ('Menunggu', 'Disetujui')
          AND deleted_at IS NULL
          AND DATE(created_at AT TIME ZONE 'Asia/Jakarta') = DATE(now() AT TIME ZONE 'Asia/Jakarta')
        LIMIT 1
      `);

      if (existingToday.rows.length > 0) {
        return {
          conflict: true,
          message: "Anda sudah mengajukan izin di perusahaan ini hari ini. Silakan ajukan kembali besok."
        };
      }

      // 3. Insert leave request
      const newLeave = await tx.insert(leaveRequests).values({
        id: crypto.randomUUID(),
        profile_id: userAuth.id,
        company_id: companyId as string,
        leave_category_id: validatedData.leave_category_id,
        start_date: validatedData.start_date,
        end_date: validatedData.end_date,
        description: validatedData.description,
        attachment_url: validatedData.attachment_url,
        status: "Menunggu", // Default status is "Menunggu"
        created_by: userAuth.id,
        updated_by: userAuth.id
      }).returning();

      return {
        conflict: false,
        data: newLeave[0]
      };
    });

    if (txResult.conflict) {
      return res.status(409).json({
        success: false,
        message: txResult.message
      });
    }

    const createdLeave = txResult.data!;

    // Add notification logic for management
    try {
      const requesterRes = await db.execute(sql`SELECT full_name, email FROM profiles WHERE id = ${userAuth.id}`);
      const requesterName = requesterRes.rows[0]?.full_name || requesterRes.rows[0]?.email || "Karyawan";

      const catRes = await db.execute(sql`
        SELECT name FROM leave_categories WHERE id = ${validatedData.leave_category_id}
      `);
      const categoryName = catRes.rows[0]?.name || "Izin / Cuti";

      // Ambil seluruh pengelola (owner, admin, manager) di perusahaan
      const managersRes = await db.execute(sql`
        SELECT DISTINCT profile_id
        FROM company_members
        WHERE company_id = ${companyId} 
          AND role IN ('owner', 'admin', 'manager')
          AND status = 'active'
          AND deleted_at IS NULL
      `);

      const adminsRes = await db.execute(sql`
        SELECT DISTINCT pr.profile_id
        FROM profile_roles pr
        JOIN profiles p ON p.id = pr.profile_id
        WHERE p.company_id = ${companyId} AND pr.role = 'Admin'
      `);

      const recipientIds = new Set<string>();
      managersRes.rows.forEach((r: any) => {
        if (r.profile_id) recipientIds.add(r.profile_id as string);
      });
      adminsRes.rows.forEach((r: any) => {
        if (r.profile_id) recipientIds.add(r.profile_id as string);
      });

      if (recipientIds.size > 0) {
        const notifData = Array.from(recipientIds).map((targetId: string) => ({
          company_id: companyId as string,
          recipient_id: targetId,
          type: "LEAVE_PENDING",
          title: "Pengajuan Izin Baru",
          message: `${requesterName} telah mengajukan permohonan ${categoryName} baru.`,
          reference_id: createdLeave.id as string,
        }));
        await db.insert(notifications).values(notifData);
      }
    } catch (notifErr) {
      console.error("Gagal mengirim notifikasi pengajuan izin ke pengelola:", notifErr);
    }

    return res.status(201).json({ success: true, data: createdLeave });

  } catch (error) {
    console.error("Error creating leave request:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Invalid data", errors: error.issues });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Admin: Get all leave requests for the company
router.get("/admin", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const userAuth = (req as any).user;
    
    // Check management role and get active company_id via resolveTenant
    const tenant = await resolveTenant(req, userAuth.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: "User is not assigned to a company." });
    }
    if (!tenant.isManagement) {
      return res.status(403).json({ success: false, message: "Only Admins or Managers can access this." });
    }
    const companyId = tenant.companyId;

    // Fetch leaves for this company
    const companyLeaves = await db.execute(sql`
      SELECT 
        lr.id, lr.start_date, lr.end_date, lr.description, lr.attachment_url, lr.status, lr.created_at, lr.rejection_reason,
        lr.approved_by, lr.approved_at,
        COALESCE(p.full_name, p.email, 'Karyawan') as employee_name, 
        p.avatar_url as employee_avatar,
        COALESCE(p_app.full_name, p_app.email) as approver_name,
        p_app.avatar_url as approver_avatar,
        COALESCE(lc.name, 'Lainnya') as category_name
      FROM leave_requests lr
      LEFT JOIN profiles p ON p.id = lr.profile_id
      LEFT JOIN profiles p_app ON p_app.id = lr.approved_by
      LEFT JOIN leave_categories lc ON lc.id = lr.leave_category_id
      WHERE lr.company_id = ${companyId}
        AND lr.deleted_at IS NULL
      ORDER BY lr.created_at DESC
    `);
      
    return res.status(200).json({ success: true, data: companyLeaves.rows });
  } catch (error) {
    console.error("Error fetching company leaves:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Admin: Update leave status
router.put("/:id/status", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const userAuth = (req as any).user;
    const leaveId = req.params.id;
    const { status, rejection_reason } = req.body; // "Disetujui" or "Ditolak"

    if (status !== "Disetujui" && status !== "Ditolak") {
      return res.status(400).json({ success: false, message: "Invalid status." });
    }

    // Alasan penolakan wajib berupa string non-kosong jika status Ditolak
    let trimmedReason: string | null = null;
    if (status === "Ditolak") {
      if (typeof rejection_reason !== "string" || !rejection_reason.trim()) {
        return res.status(400).json({
          success: false,
          message: "Alasan penolakan wajib diisi."
        });
      }
      trimmedReason = rejection_reason.trim();
    }
    
    // Check management role and get active company_id via resolveTenant
    const tenant = await resolveTenant(req, userAuth.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: "User is not assigned to a company." });
    }
    if (!tenant.isManagement) {
      return res.status(403).json({ success: false, message: "Only Admins or Managers can access this." });
    }
    const companyId = tenant.companyId;

    // Check existing leave request
    const existingLeave = await db.execute(sql`
      SELECT id, status, profile_id FROM leave_requests
      WHERE id = ${leaveId} AND company_id = ${companyId}
      LIMIT 1
    `);

    if (existingLeave.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Leave request not found or unauthorized." });
    }

    if (existingLeave.rows[0].status !== "Menunggu") {
      return res.status(409).json({
        success: false,
        message: "Pengajuan izin ini sudah diproses sebelumnya dan tidak dapat diubah lagi."
      });
    }

    // Update status and create notification in a transaction
    const updateRes = await db.transaction(async (tx) => {
      const up = await tx.execute(sql`
        UPDATE leave_requests
        SET 
          status = ${status}, 
          rejection_reason = ${trimmedReason},
          approved_by = ${userAuth.id}, 
          approved_at = now(), 
          updated_at = now()
        WHERE id = ${leaveId} AND company_id = ${companyId} AND status = 'Menunggu'
        RETURNING id, status, profile_id, rejection_reason
      `);

      if (up.rows.length > 0) {
        const leaveData = up.rows[0];
        const isApproved = status === "Disetujui";
        const notifMessage = isApproved 
          ? "Pengajuan izin Anda telah disetujui." 
          : `Pengajuan izin Anda ditolak. Alasan: "${trimmedReason}".`;
        
        await tx.insert(notifications).values({
          company_id: companyId,
          recipient_id: leaveData.profile_id as string,
          type: isApproved ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
          title: isApproved ? "Pengajuan Izin Disetujui" : "Pengajuan Izin Ditolak",
          message: notifMessage,
          reference_id: leaveData.id as string,
        });
      }
      return up;
    });
    
    if (updateRes.rows.length === 0) {
      return res.status(409).json({ success: false, message: "Pengajuan izin sudah diproses sebelumnya." });
    }

    return res.status(200).json({ success: true, data: updateRes.rows[0] });
  } catch (error) {
    console.error("Error updating leave status:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
