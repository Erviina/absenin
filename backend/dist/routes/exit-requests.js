"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middleware/auth");
const tenant_1 = require("../utils/tenant");
const pagination_1 = require("../utils/pagination");
const router = (0, express_1.Router)();
const exitRequestSchema = zod_1.z.object({
    company_id: zod_1.z.string().uuid().optional(),
    reason: zod_1.z.string().max(500, "Alasan maksimal 500 karakter").optional(),
});
// POST /api/company/exit-requests - Karyawan mengajukan keluar dari perusahaan
router.post("/", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const parseResult = exitRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: parseResult.error.errors.map((e) => e.message),
            });
        }
        const { company_id, reason } = parseResult.data;
        // Resolve tenant / company
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        const targetCompanyId = company_id || tenant?.companyId;
        if (!targetCompanyId) {
            return res.status(400).json({
                success: false,
                message: "Perusahaan tidak ditemukan atau Anda belum tergabung dalam perusahaan manapun.",
            });
        }
        // Check membership in target company
        const memberCheckRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT id, role, status
      FROM company_members
      WHERE profile_id = ${user.id}
        AND company_id = ${targetCompanyId}
        AND status = 'active'
        AND deleted_at IS NULL
      LIMIT 1
    `);
        if (memberCheckRes.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Anda bukan anggota aktif dari perusahaan ini.",
            });
        }
        const memberRole = (memberCheckRes.rows[0].role || "member").toLowerCase();
        // Owner cannot exit directly
        if (memberRole === "owner") {
            return res.status(400).json({
                success: false,
                message: "Pemilik (Owner) tidak dapat mengajukan keluar langsung. Silakan alihkan kepemilikan atau hapus perusahaan terlebih dahulu.",
            });
        }
        // Check if user already has a pending exit request for this company
        const existingReqRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT id FROM company_exit_requests
      WHERE profile_id = ${user.id}
        AND company_id = ${targetCompanyId}
        AND status = 'pending'
        AND deleted_at IS NULL
      LIMIT 1
    `);
        if (existingReqRes.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Anda sudah memiliki permohonan keluar yang masih menunggu konfirmasi dari Admin atau Manager.",
            });
        }
        // Create exit request
        const insertRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      INSERT INTO company_exit_requests (
        id, company_id, profile_id, reason, status, created_by, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${targetCompanyId},
        ${user.id},
        ${reason || null},
        'pending',
        ${user.id},
        now(),
        now()
      )
      RETURNING *
    `);
        const exitRequest = insertRes.rows[0];
        // Notify company Admins and Managers
        const managersRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT profile_id
      FROM company_members
      WHERE company_id = ${targetCompanyId}
        AND role IN ('owner', 'admin', 'manager')
        AND status = 'active'
        AND deleted_at IS NULL
        AND profile_id != ${user.id}
    `);
        const requesterRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT full_name, email FROM profiles WHERE id = ${user.id}
    `);
        const requesterName = requesterRes.rows[0]?.full_name || requesterRes.rows[0]?.email || "Karyawan";
        for (const row of managersRes.rows) {
            try {
                await db_1.db.execute((0, drizzle_orm_1.sql) `
          INSERT INTO notifications (
            id, company_id, recipient_id, type, title, message, reference_id, is_read, created_at
          )
          VALUES (
            gen_random_uuid(),
            ${targetCompanyId},
            ${row.profile_id},
            'exit_request',
            'Permohonan Keluar Karyawan',
            ${`${requesterName} telah mengajukan permohonan keluar dari perusahaan.`},
            ${exitRequest.id},
            false,
            now()
          )
        `);
            }
            catch (e) {
                console.error("Gagal mengirim notifikasi ke pengelola:", e);
            }
        }
        return res.status(201).json({
            success: true,
            message: "Permohonan keluar berhasil diajukan dan menunggu konfirmasi Admin/Manager.",
            data: exitRequest,
        });
    }
    catch (error) {
        console.error("Create exit request error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
// GET /api/company/exit-requests/me - Status permohonan keluar milik user saat ini
router.get("/me", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        const targetCompanyId = req.query.company_id || req.headers["x-company-id"] || tenant?.companyId;
        if (!targetCompanyId) {
            return res.status(200).json({
                success: true,
                data: null,
            });
        }
        const reqRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT 
        cer.id,
        cer.company_id,
        cer.profile_id,
        cer.reason,
        cer.status,
        cer.created_at,
        c.name as company_name
      FROM company_exit_requests cer
      JOIN companies c ON c.id = cer.company_id
      WHERE cer.profile_id = ${user.id}
        AND cer.company_id = ${targetCompanyId}
        AND cer.status = 'pending'
        AND cer.deleted_at IS NULL
      ORDER BY cer.created_at DESC
      LIMIT 1
    `);
        return res.status(200).json({
            success: true,
            data: reqRes.rows.length > 0 ? reqRes.rows[0] : null,
        });
    }
    catch (error) {
        console.error("Get exit request me error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
// POST /api/company/exit-requests/cancel - Batalkan permohonan keluar oleh user sendiri
router.post("/cancel", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        const targetCompanyId = req.body.company_id || req.headers["x-company-id"] || tenant?.companyId;
        if (!targetCompanyId) {
            return res.status(400).json({
                success: false,
                message: "Perusahaan tidak valid.",
            });
        }
        const updateRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE company_exit_requests
      SET status = 'cancelled', updated_at = now()
      WHERE profile_id = ${user.id}
        AND company_id = ${targetCompanyId}
        AND status = 'pending'
        AND deleted_at IS NULL
      RETURNING id
    `);
        if (updateRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Tidak ada permohonan keluar yang berstatus pending untuk dibatalkan.",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Permohonan keluar berhasil dibatalkan.",
        });
    }
    catch (error) {
        console.error("Cancel exit request error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
// GET /api/company/exit-requests - Daftar permohonan keluar untuk Admin/Manager di Kelola Karyawan
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        if (!tenant) {
            return res.status(403).json({
                success: false,
                message: "Anda tidak terhubung ke organisasi manapun.",
            });
        }
        if (!tenant.isManagement) {
            return res.status(403).json({
                success: false,
                message: "Hanya Owner, Admin, atau Manager yang diizinkan untuk melihat permohonan keluar.",
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
        OR LOWER(COALESCE(cer.reason, '')) LIKE ${s}
      )`;
        }
        // 1. Total count
        const countRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT count(*)::int as total
      FROM company_exit_requests cer
      JOIN profiles p ON p.id = cer.profile_id
      WHERE cer.company_id = ${companyId}
        AND cer.status = 'pending'
        AND cer.deleted_at IS NULL
        ${searchCondition}
    `);
        const total = Number(countRes.rows[0]?.total || 0);
        const listRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT 
        cer.id,
        cer.profile_id,
        cer.company_id,
        cer.reason,
        cer.status,
        cer.created_at,
        p.full_name,
        p.email,
        p.avatar_url,
        cm.role as member_role
      FROM company_exit_requests cer
      JOIN profiles p ON p.id = cer.profile_id
      LEFT JOIN company_members cm ON cm.company_id = cer.company_id AND cm.profile_id = cer.profile_id AND cm.deleted_at IS NULL
      WHERE cer.company_id = ${companyId}
        AND cer.status = 'pending'
        AND cer.deleted_at IS NULL
        ${searchCondition}
      ORDER BY cer.created_at ASC, cer.id ASC
      LIMIT ${limit} OFFSET ${offset}
    `);
        const pagination = (0, pagination_1.buildPaginationMeta)(total, limit, offset);
        return res.status(200).json({
            success: true,
            data: listRes.rows,
            pagination,
            meta: pagination
        });
    }
    catch (error) {
        console.error("Get exit requests error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
// POST /api/company/exit-requests/:requestId/approve - Admin/Manager mengonfirmasi pengeluaran karyawan
router.post("/:requestId/approve", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const { requestId } = req.params;
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        if (!tenant) {
            return res.status(403).json({
                success: false,
                message: "Anda tidak terhubung ke organisasi manapun.",
            });
        }
        if (!tenant.isManagement) {
            return res.status(403).json({
                success: false,
                message: "Hanya Owner, Admin, atau Manager yang dapat mengonfirmasi pengeluaran karyawan.",
            });
        }
        const companyId = tenant.companyId;
        // Fetch exit request
        const reqRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT cer.*, cm.role as target_role
      FROM company_exit_requests cer
      LEFT JOIN company_members cm ON cm.company_id = cer.company_id AND cm.profile_id = cer.profile_id AND cm.deleted_at IS NULL
      WHERE cer.id = ${requestId}
        AND cer.company_id = ${companyId}
        AND cer.status = 'pending'
        AND cer.deleted_at IS NULL
      LIMIT 1
    `);
        if (reqRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Permohonan keluar tidak ditemukan atau sudah diproses.",
            });
        }
        const exitReq = reqRes.rows[0];
        const targetProfileId = exitReq.profile_id;
        const targetRole = (exitReq.target_role || "member").toLowerCase();
        // Prevent approving own exit request
        if (user.id === targetProfileId) {
            return res.status(400).json({
                success: false,
                message: "Anda tidak dapat menyetujui permohonan keluar Anda sendiri.",
            });
        }
        // Role hierarchy check
        if (tenant.role === "admin" && (targetRole === "owner" || targetRole === "admin")) {
            return res.status(403).json({
                success: false,
                message: "Admin tidak dapat mengeluarkan Owner atau sesama Admin.",
            });
        }
        if (tenant.role === "manager" && (targetRole === "owner" || targetRole === "admin" || targetRole === "manager")) {
            return res.status(403).json({
                success: false,
                message: "Manager hanya dapat mengonfirmasi pengeluaran anggota (karyawan).",
            });
        }
        const nowIso = new Date().toISOString();
        // 1. Update exit request to 'approved'
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE company_exit_requests
      SET 
        status = 'approved',
        reviewed_by = ${user.id},
        reviewed_at = ${nowIso},
        updated_at = ${nowIso}
      WHERE id = ${requestId}
    `);
        // 2. Soft delete member from company_members
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE company_members
      SET 
        status = 'inactive',
        deleted_at = ${nowIso}
      WHERE company_id = ${companyId}
        AND profile_id = ${targetProfileId}
    `);
        // 3. Clear legacy profile company_id if matched
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE profiles
      SET company_id = NULL
      WHERE id = ${targetProfileId}
        AND company_id = ${companyId}
    `);
        // 4. Clear any join requests for this employee in this company
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE company_join_requests
      SET deleted_at = ${nowIso}
      WHERE company_id = ${companyId}
        AND profile_id = ${targetProfileId}
        AND deleted_at IS NULL
    `);
        // 4. Send notification to the user
        try {
            const approverProfileRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT full_name, email FROM profiles WHERE id = ${user.id}
      `);
            const approverName = approverProfileRes.rows[0]?.full_name || approverProfileRes.rows[0]?.email || "Manajemen";
            const memberProfileRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT full_name, email FROM profiles WHERE id = ${targetProfileId}
      `);
            const memberName = memberProfileRes.rows[0]?.full_name || memberProfileRes.rows[0]?.email || "Karyawan";
            await db_1.db.execute((0, drizzle_orm_1.sql) `
        INSERT INTO notifications (
          id, company_id, recipient_id, type, title, message, reference_id, is_read, created_at
        )
        VALUES (
          gen_random_uuid(),
          ${companyId},
          ${targetProfileId},
          'exit_approved',
          'Permohonan Keluar Disetujui',
          ${`Permohonan keluar atas nama ${memberName} telah disetujui oleh ${approverName}.`},
          ${requestId},
          false,
          now()
        )
      `);
        }
        catch (notifErr) {
            console.error("Gagal mengirim notifikasi persetujuan keluar:", notifErr);
        }
        return res.status(200).json({
            success: true,
            message: "Permohonan keluar berhasil dikonfirmasi. Anggota telah resmi dikeluarkan dari organisasi.",
            data: {
                request_id: requestId,
                profile_id: targetProfileId,
                status: "approved",
            },
        });
    }
    catch (error) {
        console.error("Approve exit request error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
            errors: [error.message],
        });
    }
});
// POST /api/company/exit-requests/:requestId/reject - Admin/Manager menolak permohonan keluar
router.post("/:requestId/reject", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const { requestId } = req.params;
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        if (!tenant) {
            return res.status(403).json({
                success: false,
                message: "Anda tidak terhubung ke organisasi manapun.",
            });
        }
        if (!tenant.isManagement) {
            return res.status(403).json({
                success: false,
                message: "Hanya Owner, Admin, atau Manager yang dapat menolak permohonan keluar.",
            });
        }
        const companyId = tenant.companyId;
        // Fetch exit request
        const reqRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT cer.*
      FROM company_exit_requests cer
      WHERE cer.id = ${requestId}
        AND cer.company_id = ${companyId}
        AND cer.status = 'pending'
        AND cer.deleted_at IS NULL
      LIMIT 1
    `);
        if (reqRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Permohonan keluar tidak ditemukan atau sudah diproses.",
            });
        }
        const exitReq = reqRes.rows[0];
        const targetProfileId = exitReq.profile_id;
        // Prevent rejecting own exit request
        if (user.id === targetProfileId) {
            return res.status(400).json({
                success: false,
                message: "Anda tidak dapat menolak permohonan keluar Anda sendiri. Gunakan tombol batalkan.",
            });
        }
        const nowIso = new Date().toISOString();
        // 1. Update exit request to 'rejected'
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE company_exit_requests
      SET 
        status = 'rejected',
        reviewed_by = ${user.id},
        reviewed_at = ${nowIso},
        updated_at = ${nowIso}
      WHERE id = ${requestId}
    `);
        // 2. Send notification to the user
        try {
            await db_1.db.execute((0, drizzle_orm_1.sql) `
        INSERT INTO notifications (
          id, company_id, recipient_id, type, title, message, reference_id, is_read, created_at
        )
        VALUES (
          gen_random_uuid(),
          ${companyId},
          ${targetProfileId},
          'exit_rejected',
          'Permohonan Keluar Ditolak',
          'Permohonan keluar Anda telah ditolak oleh manajemen.',
          ${requestId},
          false,
          now()
        )
      `);
        }
        catch (notifErr) {
            console.error("Gagal mengirim notifikasi penolakan keluar:", notifErr);
        }
        return res.status(200).json({
            success: true,
            message: "Permohonan keluar berhasil ditolak.",
            data: {
                request_id: requestId,
                profile_id: targetProfileId,
                status: "rejected",
            },
        });
    }
    catch (error) {
        console.error("Reject exit request error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
            errors: [error.message],
        });
    }
});
exports.default = router;
