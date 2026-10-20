"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middleware/auth");
const schema_1 = require("../db/schema");
const tenant_1 = require("../utils/tenant");
const pagination_1 = require("../utils/pagination");
const router = (0, express_1.Router)();
const joinRequestSchema = zod_1.z.object({
    join_code: zod_1.z.string().min(1, "Join code wajib diisi"),
});
// POST /api/company/join-requests
router.post("/", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const parseResult = joinRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: parseResult.error.errors.map((e) => e.message),
            });
        }
        const { join_code } = parseResult.data;
        // 1. Check if company exists
        const companyRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT id, name FROM companies WHERE join_code = ${join_code} AND deleted_at IS NULL
    `);
        if (companyRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Kode join tidak valid",
                errors: ["Perusahaan tidak ditemukan dengan kode tersebut"],
            });
        }
        const companyId = companyRes.rows[0].id;
        // 2. Check if user is already an active member of THIS company
        const memberCheckRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT id FROM company_members 
      WHERE profile_id = ${user.id} AND company_id = ${companyId} AND status = 'active' AND deleted_at IS NULL
    `);
        if (memberCheckRes.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Anda sudah tergabung dalam organisasi / perusahaan ini",
                errors: [],
            });
        }
        // 3. Check if user already has a pending request for THIS company
        const pendingRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT id FROM company_join_requests 
      WHERE profile_id = ${user.id} AND company_id = ${companyId} AND status = 'pending' AND deleted_at IS NULL
    `);
        if (pendingRes.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Anda sudah memiliki permintaan bergabung yang masih menunggu persetujuan",
                errors: [],
            });
        }
        // 4. Create the join request
        const insertRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      INSERT INTO company_join_requests (id, profile_id, company_id, status, created_by, created_at, updated_at)
      VALUES (gen_random_uuid(), ${user.id}, ${companyId}, 'pending', ${user.id}, now(), now())
      RETURNING *
    `);
        const joinRequest = insertRes.rows[0];
        // 5. Send notification to Admins
        const adminsRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT pr.profile_id
      FROM profile_roles pr
      JOIN profiles p ON p.id = pr.profile_id
      WHERE p.company_id = ${companyId} AND pr.role = 'Admin'
    `);
        const requesterRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT full_name, email FROM profiles WHERE id = ${user.id}
    `);
        const requesterName = requesterRes.rows[0]?.full_name || requesterRes.rows[0]?.email || "User";
        if (adminsRes.rows.length > 0) {
            const notifData = adminsRes.rows.map((admin) => ({
                company_id: companyId,
                recipient_id: admin.profile_id,
                type: "JOIN_REQUEST_PENDING",
                title: "Permintaan Bergabung",
                message: `${requesterName} mengajukan permintaan bergabung ke perusahaan.`,
                reference_id: joinRequest.id,
            }));
            await db_1.db.insert(schema_1.notifications).values(notifData);
        }
        return res.status(201).json({
            success: true,
            message: "Request bergabung berhasil dikirim",
            data: insertRes.rows[0],
        });
    }
    catch (error) {
        console.error("Create join request error:", error);
        // Handle specific DB errors if needed
        if (error.code === '23505' && error.constraint === 'company_join_requests_one_pending_per_profile') {
            return res.status(400).json({
                success: false,
                message: "Anda sudah memiliki request yang masih pending",
                errors: [],
            });
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
// GET /api/company/join-requests/me
router.get("/me", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        // 1. Check if there is a pending request
        const pendingRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT cjr.id, cjr.company_id, cjr.status, cjr.created_at, c.name as company_name 
      FROM company_join_requests cjr
      JOIN companies c ON c.id = cjr.company_id
      WHERE cjr.profile_id = ${user.id} AND cjr.status = 'pending' AND cjr.deleted_at IS NULL
      ORDER BY cjr.created_at DESC
      LIMIT 1
    `);
        if (pendingRes.rows.length > 0) {
            return res.status(200).json({
                success: true,
                message: "Berhasil mengambil request",
                data: pendingRes.rows[0],
            });
        }
        // 2. If no pending request, check if there is an approved request
        // Pastikan keanggotaan masih aktif dan belum diakui (deleted_at IS NULL), serta disetujui dalam 24 jam terakhir
        const approvedRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT cjr.id, cjr.company_id, cjr.status, cjr.created_at, c.name as company_name 
      FROM company_join_requests cjr
      JOIN companies c ON c.id = cjr.company_id
      JOIN company_members cm ON cm.company_id = cjr.company_id AND cm.profile_id = cjr.profile_id
      WHERE cjr.profile_id = ${user.id} 
        AND cjr.status = 'approved' 
        AND cjr.deleted_at IS NULL
        AND cm.status = 'active'
        AND cm.deleted_at IS NULL
        AND (cjr.updated_at >= now() - interval '24 hours' OR cjr.reviewed_at >= now() - interval '24 hours')
      ORDER BY cjr.updated_at DESC
      LIMIT 1
    `);
        if (approvedRes.rows.length > 0) {
            return res.status(200).json({
                success: true,
                message: "Berhasil mengambil request yang disetujui",
                data: approvedRes.rows[0],
            });
        }
        return res.status(200).json({
            success: true,
            message: "Tidak ada request",
            data: null,
        });
    }
    catch (error) {
        console.error("Get join request me error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
// POST /api/company/join-requests/:requestId/acknowledge
router.post("/:requestId/acknowledge", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const { requestId } = req.params;
        // Tandai permintaan bergabung ini sudah diakui/dilihat oleh pengguna (arsip / soft-delete request)
        // Keanggotaan di company_members tetap aktif
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE company_join_requests 
      SET deleted_at = now(), updated_at = now()
      WHERE id = ${requestId} 
        AND profile_id = ${user.id} 
        AND status = 'approved' 
        AND deleted_at IS NULL
    `);
        return res.status(200).json({
            success: true,
            message: "Permintaan bergabung telah diakui",
        });
    }
    catch (error) {
        console.error("Acknowledge join request error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
// GET /api/company/join-requests
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        if (!tenant) {
            return res.status(403).json({
                success: false,
                message: "Forbidden",
                errors: ["Anda tidak terhubung ke perusahaan manapun"],
            });
        }
        if (!tenant.isManagement) {
            return res.status(403).json({
                success: false,
                message: "Forbidden",
                errors: ["Hanya Owner/Admin/Manager yang diizinkan untuk mengakses daftar request bergabung"],
            });
        }
        const companyId = tenant.companyId;
        const { limit, offset } = (0, pagination_1.parsePaginationParams)(req.query, 10, 100);
        const { search } = req.query;
        let searchCondition = (0, drizzle_orm_1.sql) ``;
        if (search && typeof search === 'string' && search.trim() !== '') {
            const s = `%${search.trim().toLowerCase()}%`;
            searchCondition = (0, drizzle_orm_1.sql) `AND (
        LOWER(p.full_name) LIKE ${s}
        OR LOWER(p.email) LIKE ${s}
      )`;
        }
        // 1. Total count
        const countRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT count(*)::int as total
      FROM company_join_requests cjr
      JOIN profiles p ON p.id = cjr.profile_id
      WHERE cjr.company_id = ${companyId} 
        AND cjr.status = 'pending' 
        AND cjr.deleted_at IS NULL
        ${searchCondition}
    `);
        const total = Number(countRes.rows[0]?.total || 0);
        // 2. Fetch the join requests for the company
        const requestsRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT 
        cjr.id, 
        cjr.profile_id, 
        cjr.company_id, 
        cjr.status, 
        cjr.created_at,
        p.full_name,
        p.email,
        p.avatar_url
      FROM company_join_requests cjr
      JOIN profiles p ON p.id = cjr.profile_id
      WHERE cjr.company_id = ${companyId} 
        AND cjr.status = 'pending' 
        AND cjr.deleted_at IS NULL
        ${searchCondition}
      ORDER BY cjr.created_at ASC, cjr.id ASC
      LIMIT ${limit} OFFSET ${offset}
    `);
        const pagination = (0, pagination_1.buildPaginationMeta)(total, limit, offset);
        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil daftar request",
            data: requestsRes.rows,
            pagination,
            meta: pagination
        });
    }
    catch (error) {
        console.error("Get join requests error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
// POST /api/company/join-requests/:requestId/approve
router.post("/:requestId/approve", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const { requestId } = req.params;
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        if (!tenant) {
            return res.status(403).json({
                success: false,
                message: "Forbidden",
                errors: ["Anda tidak terhubung ke perusahaan manapun"],
            });
        }
        if (!tenant.isManagement) {
            return res.status(403).json({
                success: false,
                message: "Forbidden",
                errors: ["Hanya Owner/Admin/Manager yang diizinkan untuk melakukan aksi ini"],
            });
        }
        const companyId = tenant.companyId;
        // 3. Find the join request
        const requestRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT id, profile_id, company_id, status 
      FROM company_join_requests 
      WHERE id = ${requestId} AND deleted_at IS NULL
    `);
        if (requestRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Request tidak ditemukan",
                errors: [],
            });
        }
        const joinRequest = requestRes.rows[0];
        // 4. Validate request status and company_id
        if (joinRequest.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: "Request ini sudah diproses sebelumnya",
                errors: [],
            });
        }
        if (joinRequest.company_id !== companyId) {
            return res.status(403).json({
                success: false,
                message: "Forbidden",
                errors: ["Request ini bukan untuk perusahaan Anda"],
            });
        }
        // 5. Execute transaction to approve
        await db_1.db.transaction(async (tx) => {
            // Update join request
            const updateResult = await tx.execute((0, drizzle_orm_1.sql) `
        UPDATE company_join_requests 
        SET status = 'approved', reviewed_at = now(), reviewed_by = ${user.id}, updated_by = ${user.id}, updated_at = now()
        WHERE id = ${requestId} AND status = 'pending'
        RETURNING id
      `);
            if (updateResult.rows.length === 0) {
                throw new Error("Request ini sudah diproses sebelumnya");
            }
            // Add to company_members
            await tx.execute((0, drizzle_orm_1.sql) `
        INSERT INTO company_members (id, company_id, profile_id, role, status, joined_at)
        VALUES (gen_random_uuid(), ${companyId}, ${joinRequest.profile_id}, 'member', 'active', now())
        ON CONFLICT (company_id, profile_id) 
        DO UPDATE SET role = 'member', status = 'active', deleted_at = NULL
      `);
            // Update user profile for backward compatibility
            await tx.execute((0, drizzle_orm_1.sql) `
        UPDATE profiles
        SET company_id = ${companyId}
        WHERE id = ${joinRequest.profile_id}
      `);
            // Add Employee role if not exists
            await tx.execute((0, drizzle_orm_1.sql) `
        INSERT INTO profile_roles (profile_id, role)
        VALUES (${joinRequest.profile_id}, 'Employee')
        ON CONFLICT DO NOTHING
      `);
            // Create notifications with member and approver info
            try {
                const memberProfileRes = await tx.execute((0, drizzle_orm_1.sql) `
          SELECT full_name, email FROM profiles WHERE id = ${joinRequest.profile_id}
        `);
                const memberName = memberProfileRes.rows[0]?.full_name || memberProfileRes.rows[0]?.email || "Anggota";
                const approverProfileRes = await tx.execute((0, drizzle_orm_1.sql) `
          SELECT full_name, email FROM profiles WHERE id = ${user.id}
        `);
                const approverName = approverProfileRes.rows[0]?.full_name || approverProfileRes.rows[0]?.email || "Admin";
                const companyRes = await tx.execute((0, drizzle_orm_1.sql) `
          SELECT name FROM companies WHERE id = ${companyId}
        `);
                const companyName = companyRes.rows[0]?.name || "organisasi / perusahaan";
                // 1. Notifikasi untuk anggota yang bergabung
                await tx.insert(schema_1.notifications).values({
                    company_id: companyId,
                    recipient_id: joinRequest.profile_id,
                    type: "JOIN_REQUEST_APPROVED",
                    title: "Permintaan Bergabung Disetujui",
                    message: "Permintaan bergabung Anda telah disetujui.",
                    reference_id: joinRequest.id,
                });
                // 2. Notifikasi untuk pengelola/admin perusahaan
                const managersRes = await tx.execute((0, drizzle_orm_1.sql) `
          SELECT DISTINCT profile_id FROM company_members
          WHERE company_id = ${companyId}
            AND role IN ('owner', 'admin', 'manager')
            AND status = 'active'
            AND deleted_at IS NULL
        `);
                const adminsRes = await tx.execute((0, drizzle_orm_1.sql) `
          SELECT DISTINCT pr.profile_id
          FROM profile_roles pr
          JOIN profiles p ON p.id = pr.profile_id
          WHERE p.company_id = ${companyId} AND pr.role = 'Admin'
        `);
                const recipientIds = new Set();
                managersRes.rows.forEach((r) => {
                    if (r.profile_id && r.profile_id !== joinRequest.profile_id) {
                        recipientIds.add(r.profile_id);
                    }
                });
                adminsRes.rows.forEach((r) => {
                    if (r.profile_id && r.profile_id !== joinRequest.profile_id) {
                        recipientIds.add(r.profile_id);
                    }
                });
                const adminNotifMessage = `${memberName} telah resmi bergabung ke ${companyName} setelah disetujui oleh ${approverName}.`;
                for (const targetId of recipientIds) {
                    await tx.insert(schema_1.notifications).values({
                        company_id: companyId,
                        recipient_id: targetId,
                        type: "JOIN_REQUEST_APPROVED",
                        title: "Anggota Baru Bergabung",
                        message: adminNotifMessage,
                        reference_id: joinRequest.id,
                    });
                }
            }
            catch (notifErr) {
                console.error("Gagal mengirim notifikasi persetujuan bergabung:", notifErr);
            }
        });
        return res.status(200).json({
            success: true,
            message: "Request berhasil disetujui",
            data: null,
        });
    }
    catch (error) {
        if (error.message === "Request ini sudah diproses sebelumnya") {
            return res.status(400).json({
                success: false,
                message: error.message,
                errors: [],
            });
        }
        console.error("Approve join request error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
            errors: [error.message],
        });
    }
});
// POST /api/company/join-requests/:requestId/reject
router.post("/:requestId/reject", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const { requestId } = req.params;
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        if (!tenant) {
            return res.status(403).json({
                success: false,
                message: "Forbidden",
                errors: ["Anda tidak terhubung ke perusahaan manapun"],
            });
        }
        if (!tenant.isManagement) {
            return res.status(403).json({
                success: false,
                message: "Forbidden",
                errors: ["Hanya Owner/Admin/Manager yang diizinkan untuk melakukan aksi ini"],
            });
        }
        const companyId = tenant.companyId;
        const requestRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT cjr.id, cjr.profile_id, cjr.company_id, cjr.status, c.name as company_name 
      FROM company_join_requests cjr
      LEFT JOIN companies c ON c.id = cjr.company_id
      WHERE cjr.id = ${requestId} AND cjr.deleted_at IS NULL
    `);
        if (requestRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Request tidak ditemukan",
                errors: [],
            });
        }
        const joinRequest = requestRes.rows[0];
        if (joinRequest.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: "Request ini sudah diproses sebelumnya",
                errors: [],
            });
        }
        if (joinRequest.company_id !== companyId) {
            return res.status(403).json({
                success: false,
                message: "Forbidden",
                errors: ["Request ini bukan untuk perusahaan Anda"],
            });
        }
        await db_1.db.transaction(async (tx) => {
            const updateResult = await tx.execute((0, drizzle_orm_1.sql) `
        UPDATE company_join_requests 
        SET status = 'rejected', reviewed_at = now(), reviewed_by = ${user.id}, updated_by = ${user.id}, updated_at = now()
        WHERE id = ${requestId} AND status = 'pending'
        RETURNING id
      `);
            if (updateResult.rows.length === 0) {
                throw new Error("Request ini sudah diproses sebelumnya");
            }
            // Pastikan pengguna tidak memiliki atau mempertahankan keanggotaan aktif di perusahaan ini
            await tx.execute((0, drizzle_orm_1.sql) `
        UPDATE company_members 
        SET status = 'inactive', deleted_at = now()
        WHERE company_id = ${companyId} AND profile_id = ${joinRequest.profile_id} AND status = 'active'
      `);
            await tx.execute((0, drizzle_orm_1.sql) `
        UPDATE profiles
        SET company_id = NULL
        WHERE id = ${joinRequest.profile_id} AND company_id = ${companyId}
      `);
            try {
                const companyName = joinRequest.company_name || "perusahaan";
                const memberProfileRes = await tx.execute((0, drizzle_orm_1.sql) `
          SELECT full_name, email FROM profiles WHERE id = ${joinRequest.profile_id}
        `);
                const memberName = memberProfileRes.rows[0]?.full_name || memberProfileRes.rows[0]?.email || "Pengguna";
                const reviewerProfileRes = await tx.execute((0, drizzle_orm_1.sql) `
          SELECT full_name, email FROM profiles WHERE id = ${user.id}
        `);
                const reviewerName = reviewerProfileRes.rows[0]?.full_name || reviewerProfileRes.rows[0]?.email || "Manajemen";
                await tx.insert(schema_1.notifications).values({
                    company_id: companyId,
                    recipient_id: joinRequest.profile_id,
                    type: "JOIN_REQUEST_REJECTED",
                    title: "Permintaan Bergabung Ditolak",
                    message: `Maaf, permintaan bergabung atas nama ${memberName} ke ${companyName} telah ditolak oleh ${reviewerName}.`,
                    reference_id: joinRequest.id,
                });
            }
            catch (notifErr) {
                console.error("Gagal mengirim notifikasi penolakan bergabung:", notifErr);
            }
        });
        return res.status(200).json({
            success: true,
            message: "Request berhasil ditolak",
            data: null,
        });
    }
    catch (error) {
        if (error.message === "Request ini sudah diproses sebelumnya") {
            return res.status(400).json({
                success: false,
                message: error.message,
                errors: [],
            });
        }
        console.error("Reject join request error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
            errors: [error.message],
        });
    }
});
exports.default = router;
