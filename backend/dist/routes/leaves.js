"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const auth_1 = require("../middleware/auth");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
const tenant_1 = require("../utils/tenant");
const pagination_1 = require("../utils/pagination");
const router = express_1.default.Router();
// Get all leave categories
router.get("/categories", async (req, res) => {
    try {
        const categories = await db_1.db.select().from(schema_1.leaveCategories).where((0, drizzle_orm_1.sql) `deleted_at IS NULL`);
        res.json({ success: true, data: categories });
    }
    catch (error) {
        console.error("Error fetching leave categories:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
// Get user's leave requests with approver info
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        const { limit, offset } = (0, pagination_1.parsePaginationParams)(req.query, 10, 100);
        const { status, category, category_id, start_date, end_date, search } = req.query;
        const companyCondition = tenant ? (0, drizzle_orm_1.sql) `AND (lr.company_id = ${tenant.companyId} OR lr.company_id IS NULL)` : (0, drizzle_orm_1.sql) ``;
        let filterConditions = (0, drizzle_orm_1.sql) ``;
        if (status && typeof status === "string" && status !== "Semua") {
            filterConditions = (0, drizzle_orm_1.sql) `${filterConditions} AND lr.status = ${status}`;
        }
        if (category_id && typeof category_id === "string") {
            filterConditions = (0, drizzle_orm_1.sql) `${filterConditions} AND lr.leave_category_id = ${category_id}`;
        }
        else if (category && typeof category === "string" && category !== "Semua Kategori" && category !== "Semua") {
            filterConditions = (0, drizzle_orm_1.sql) `${filterConditions} AND (lc.name ILIKE ${category} OR lc.name ILIKE ${'%' + category + '%'})`;
        }
        if (start_date && typeof start_date === "string") {
            filterConditions = (0, drizzle_orm_1.sql) `${filterConditions} AND (DATE(lr.start_date) <= ${start_date}::date AND DATE(lr.end_date) >= ${start_date}::date)`;
        }
        if (end_date && typeof end_date === "string") {
            filterConditions = (0, drizzle_orm_1.sql) `${filterConditions} AND (DATE(lr.end_date) <= ${end_date}::date)`;
        }
        if (search && typeof search === "string" && search.trim()) {
            const q = `%${search.trim()}%`;
            filterConditions = (0, drizzle_orm_1.sql) `${filterConditions} AND (lr.description ILIKE ${q} OR lc.name ILIKE ${q})`;
        }
        // 1. Total count
        const countRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT COUNT(*) as total
      FROM leave_requests lr
      LEFT JOIN leave_categories lc ON lc.id = lr.leave_category_id
      WHERE lr.profile_id = ${user.id} 
        AND lr.deleted_at IS NULL
        ${companyCondition}
        ${filterConditions}
    `);
        const total = parseInt(countRes.rows[0]?.total, 10) || 0;
        // 2. Fetch paginated leave requests for this user, ordered by created_at desc with approver profile info
        const userLeaves = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
        ${filterConditions}
      ORDER BY lr.created_at DESC, lr.id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);
        res.json({
            success: true,
            data: userLeaves.rows,
            pagination: (0, pagination_1.buildPaginationMeta)(total, limit, offset),
            meta: {
                total,
                limit,
                offset,
            }
        });
    }
    catch (error) {
        console.error("Error fetching user leaves:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
// Schema for creating a leave request
const createLeaveSchema = zod_1.z.object({
    leave_category_id: zod_1.z.string().uuid(),
    start_date: zod_1.z.string(),
    end_date: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    attachment_url: zod_1.z.string().optional(),
});
// Create a new leave request
router.post("/", auth_1.authenticate, async (req, res) => {
    try {
        const userAuth = req.user;
        const tenant = await (0, tenant_1.resolveTenant)(req, userAuth.id);
        if (!tenant) {
            return res.status(400).json({ success: false, message: "User is not assigned to an active company or tenant." });
        }
        const companyId = tenant.companyId;
        // Validate request body
        const validatedData = createLeaveSchema.parse(req.body);
        // Use transaction with transaction-level advisory lock to serialize concurrent submissions and check daily quota
        const txResult = await db_1.db.transaction(async (tx) => {
            // 1. Transaction-level advisory lock on (hashtext('leave_requests'), hashtext(userAuth.id || companyId))
            // Serializes concurrent requests from the same user for this company
            await tx.execute((0, drizzle_orm_1.sql) `
        SELECT pg_advisory_xact_lock(hashtext('leave_requests'), hashtext(${userAuth.id} || ${companyId}))
      `);
            // 2. Check if user already submitted an active leave request today for THIS company with status 'Menunggu' or 'Disetujui' in Asia/Jakarta timezone
            const existingToday = await tx.execute((0, drizzle_orm_1.sql) `
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
            const newLeave = await tx.insert(schema_1.leaveRequests).values({
                id: crypto_1.default.randomUUID(),
                profile_id: userAuth.id,
                company_id: companyId,
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
        const createdLeave = txResult.data;
        // Add notification logic for management
        try {
            const requesterRes = await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT full_name, email FROM profiles WHERE id = ${userAuth.id}`);
            const requesterName = requesterRes.rows[0]?.full_name || requesterRes.rows[0]?.email || "Karyawan";
            const catRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT name FROM leave_categories WHERE id = ${validatedData.leave_category_id}
      `);
            const categoryName = catRes.rows[0]?.name || "Izin / Cuti";
            // Ambil seluruh pengelola (owner, admin, manager) di perusahaan
            const managersRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT DISTINCT profile_id
        FROM company_members
        WHERE company_id = ${companyId} 
          AND role IN ('owner', 'admin', 'manager')
          AND status = 'active'
          AND deleted_at IS NULL
      `);
            const adminsRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT DISTINCT pr.profile_id
        FROM profile_roles pr
        JOIN profiles p ON p.id = pr.profile_id
        WHERE p.company_id = ${companyId} AND pr.role = 'Admin'
      `);
            const recipientIds = new Set();
            managersRes.rows.forEach((r) => {
                if (r.profile_id)
                    recipientIds.add(r.profile_id);
            });
            adminsRes.rows.forEach((r) => {
                if (r.profile_id)
                    recipientIds.add(r.profile_id);
            });
            if (recipientIds.size > 0) {
                const notifData = Array.from(recipientIds).map((targetId) => ({
                    company_id: companyId,
                    recipient_id: targetId,
                    type: "LEAVE_PENDING",
                    title: "Pengajuan Izin",
                    message: `${requesterName} mengajukan permohonan ${categoryName}.`,
                    reference_id: createdLeave.id,
                }));
                await db_1.db.insert(schema_1.notifications).values(notifData);
            }
        }
        catch (notifErr) {
            console.error("Gagal mengirim notifikasi pengajuan izin ke pengelola:", notifErr);
        }
        return res.status(201).json({ success: true, data: createdLeave });
    }
    catch (error) {
        console.error("Error creating leave request:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, message: "Invalid data", errors: error.issues });
        }
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});
// Admin: Get all leave requests for the company
router.get("/admin", auth_1.authenticate, async (req, res) => {
    try {
        const userAuth = req.user;
        // Check management role and get active company_id via resolveTenant
        const tenant = await (0, tenant_1.resolveTenant)(req, userAuth.id);
        if (!tenant) {
            return res.status(404).json({ success: false, message: "User is not assigned to a company." });
        }
        if (!tenant.isManagement) {
            return res.status(403).json({ success: false, message: "Only Admins or Managers can access this." });
        }
        const companyId = tenant.companyId;
        const { limit, offset } = (0, pagination_1.parsePaginationParams)(req.query, 10, 100);
        const { status, category, category_id, search, start_date, end_date } = req.query;
        let filterConditions = (0, drizzle_orm_1.sql) ``;
        if (status && typeof status === "string" && status !== "Semua") {
            filterConditions = (0, drizzle_orm_1.sql) `${filterConditions} AND lr.status = ${status}`;
        }
        if (category_id && typeof category_id === "string") {
            filterConditions = (0, drizzle_orm_1.sql) `${filterConditions} AND lr.leave_category_id = ${category_id}`;
        }
        else if (category && typeof category === "string" && category !== "Semua") {
            filterConditions = (0, drizzle_orm_1.sql) `${filterConditions} AND (lc.name ILIKE ${category} OR lc.name ILIKE ${'%' + category + '%'})`;
        }
        if (start_date && typeof start_date === "string") {
            filterConditions = (0, drizzle_orm_1.sql) `${filterConditions} AND (DATE(lr.start_date) <= ${start_date}::date AND DATE(lr.end_date) >= ${start_date}::date)`;
        }
        if (end_date && typeof end_date === "string") {
            filterConditions = (0, drizzle_orm_1.sql) `${filterConditions} AND (DATE(lr.end_date) <= ${end_date}::date)`;
        }
        if (search && typeof search === "string" && search.trim()) {
            const q = `%${search.trim()}%`;
            filterConditions = (0, drizzle_orm_1.sql) `${filterConditions} AND (
        p.full_name ILIKE ${q} OR 
        p.email ILIKE ${q} OR 
        lr.description ILIKE ${q} OR 
        lc.name ILIKE ${q}
      )`;
        }
        // 1. Total count
        const countRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT COUNT(*) as total
      FROM leave_requests lr
      LEFT JOIN profiles p ON p.id = lr.profile_id
      LEFT JOIN leave_categories lc ON lc.id = lr.leave_category_id
      WHERE lr.company_id = ${companyId}
        AND lr.deleted_at IS NULL
        ${filterConditions}
    `);
        const total = parseInt(countRes.rows[0]?.total, 10) || 0;
        // 2. Fetch leaves for this company
        const companyLeaves = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
        ${filterConditions}
      ORDER BY lr.created_at DESC, lr.id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);
        return res.status(200).json({
            success: true,
            data: companyLeaves.rows,
            pagination: (0, pagination_1.buildPaginationMeta)(total, limit, offset),
            meta: {
                total,
                limit,
                offset,
            }
        });
    }
    catch (error) {
        console.error("Error fetching company leaves:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});
// Admin: Update leave status
router.put("/:id/status", auth_1.authenticate, async (req, res) => {
    try {
        const userAuth = req.user;
        const leaveId = req.params.id;
        const { status, rejection_reason } = req.body; // "Disetujui" or "Ditolak"
        if (status !== "Disetujui" && status !== "Ditolak") {
            return res.status(400).json({ success: false, message: "Invalid status." });
        }
        // Alasan penolakan wajib berupa string non-kosong jika status Ditolak
        let trimmedReason = null;
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
        const tenant = await (0, tenant_1.resolveTenant)(req, userAuth.id);
        if (!tenant) {
            return res.status(404).json({ success: false, message: "User is not assigned to a company." });
        }
        if (!tenant.isManagement) {
            return res.status(403).json({ success: false, message: "Only Admins or Managers can access this." });
        }
        const companyId = tenant.companyId;
        // Check existing leave request
        const existingLeave = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
        const updateRes = await db_1.db.transaction(async (tx) => {
            const up = await tx.execute((0, drizzle_orm_1.sql) `
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
                await tx.insert(schema_1.notifications).values({
                    company_id: companyId,
                    recipient_id: leaveData.profile_id,
                    type: isApproved ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
                    title: isApproved ? "Pengajuan Izin Disetujui" : "Pengajuan Izin Ditolak",
                    message: notifMessage,
                    reference_id: leaveData.id,
                });
            }
            return up;
        });
        if (updateRes.rows.length === 0) {
            return res.status(409).json({ success: false, message: "Pengajuan izin sudah diproses sebelumnya." });
        }
        return res.status(200).json({ success: true, data: updateRes.rows[0] });
    }
    catch (error) {
        console.error("Error updating leave status:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});
exports.default = router;
