import express, { Request, Response } from "express";
import { db } from "../db";
import { leaveRequests, leaveCategories, notifications } from "../db/schema";
import { authenticate } from "../middleware/auth";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

const router = express.Router();

// Get all leave categories
router.get("/categories", async (req: Request, res: Response) => {
  try {
    const categories = await db.select().from(leaveCategories);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error("Error fetching leave categories:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get user's leave requests
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Fetch leave requests for this user, ordered by created_at desc
    const userLeaves = await db.select()
      .from(leaveRequests)
      .where(eq(leaveRequests.profile_id, user.id))
      .orderBy(desc(leaveRequests.created_at));
      
    res.json({ success: true, data: userLeaves });
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
    
    // Fetch full profile from db to get company_id
    const profileRes = await db.execute(sql`SELECT company_id FROM profiles WHERE id = ${userAuth.id}`);
    if (profileRes.rows.length === 0 || !profileRes.rows[0].company_id) {
      return res.status(400).json({ success: false, message: "User is not assigned to a company." });
    }
    const companyId = profileRes.rows[0].company_id;

    // Validate request body
    const validatedData = createLeaveSchema.parse(req.body);

    // Insert leave request
    const newLeave = await db.insert(leaveRequests).values({
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
    
    // Add notification logic
    const requesterRes = await db.execute(sql`SELECT full_name, email FROM profiles WHERE id = ${userAuth.id}`);
    const requesterName = requesterRes.rows[0]?.full_name || requesterRes.rows[0]?.email || "Employee";

    const managersAdminsRes = await db.execute(sql`
      SELECT pr.profile_id
      FROM profile_roles pr
      JOIN profiles p ON p.id = pr.profile_id
      WHERE p.company_id = ${companyId} 
        AND pr.role IN ('Admin', 'Manager')
        AND pr.profile_id != ${userAuth.id}
    `);

    if (managersAdminsRes.rows.length > 0) {
      const notifData = managersAdminsRes.rows.map((userRow: any) => ({
        company_id: companyId as string,
        recipient_id: userRow.profile_id as string,
        type: "LEAVE_PENDING",
        title: "Pengajuan Izin Baru",
        message: `${requesterName} mengajukan izin/cuti baru.`,
        reference_id: newLeave[0].id as string,
      }));
      await db.insert(notifications).values(notifData);
    }

    res.status(201).json({ success: true, data: newLeave[0] });
  } catch (error) {
    console.error("Error creating leave request:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Invalid data", errors: error.issues });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Admin: Get all leave requests for the company
router.get("/admin", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const userAuth = (req as any).user;
    
    // Check if user is admin and get company_id
    const profileRes = await db.execute(sql`
      SELECT p.company_id, pr.role 
      FROM profiles p
      LEFT JOIN profile_roles pr ON pr.profile_id = p.id AND pr.role = 'Admin'
      WHERE p.id = ${userAuth.id}
    `);
    
    if (profileRes.rows.length === 0 || !profileRes.rows[0].company_id) {
      return res.status(403).json({ success: false, message: "User is not assigned to a company." });
    }
    
    if (!profileRes.rows[0].role) {
      return res.status(403).json({ success: false, message: "Only Admins can access this." });
    }
    
    const companyId = profileRes.rows[0].company_id;

    // Fetch leaves for this company
    const companyLeaves = await db.execute(sql`
      SELECT 
        lr.id, lr.start_date, lr.end_date, lr.description, lr.attachment_url, lr.status, lr.created_at,
        p.full_name as employee_name, p.avatar_url as employee_avatar,
        lc.name as category_name
      FROM leave_requests lr
      JOIN profiles p ON p.id = lr.profile_id
      JOIN leave_categories lc ON lc.id = lr.leave_category_id
      WHERE lr.company_id = ${companyId}
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
    const { status } = req.body; // "Disetujui" or "Ditolak"

    if (status !== "Disetujui" && status !== "Ditolak") {
      return res.status(400).json({ success: false, message: "Invalid status." });
    }
    
    // Check if user is admin and get company_id
    const profileRes = await db.execute(sql`
      SELECT p.company_id, pr.role 
      FROM profiles p
      LEFT JOIN profile_roles pr ON pr.profile_id = p.id AND pr.role = 'Admin'
      WHERE p.id = ${userAuth.id}
    `);
    
    if (profileRes.rows.length === 0 || !profileRes.rows[0].company_id) {
      return res.status(403).json({ success: false, message: "User is not assigned to a company." });
    }
    
    if (!profileRes.rows[0].role) {
      return res.status(403).json({ success: false, message: "Only Admins can access this." });
    }
    
    const companyId = profileRes.rows[0].company_id as string;

    // Update status and create notification in a transaction
    const updateRes = await db.transaction(async (tx) => {
      const up = await tx.execute(sql`
        UPDATE leave_requests
        SET status = ${status}, approved_by = ${userAuth.id}, approved_at = now(), updated_at = now()
        WHERE id = ${leaveId} AND company_id = ${companyId}
        RETURNING id, status, profile_id
      `);

      if (up.rows.length > 0) {
        const leaveData = up.rows[0];
        const isApproved = status === "Disetujui";
        
        await tx.insert(notifications).values({
          company_id: companyId,
          recipient_id: leaveData.profile_id as string,
          type: isApproved ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
          title: isApproved ? "Pengajuan Izin Disetujui" : "Pengajuan Izin Ditolak",
          message: isApproved 
            ? "Pengajuan izin Anda telah disetujui." 
            : "Maaf, pengajuan izin Anda ditolak.",
          reference_id: leaveData.id as string,
        });
      }
      return up;
    });
    
    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Leave request not found or unauthorized." });
    }

    return res.status(200).json({ success: true, data: updateRes.rows[0] });
  } catch (error) {
    console.error("Error updating leave status:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
