import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { resolveTenant } from "../utils/tenant";
import { parsePaginationParams, buildPaginationMeta } from "../utils/pagination";

const router = Router();

const exitRequestSchema = z.object({
  company_id: z.string().uuid().optional(),
  reason: z.string().max(500, "Alasan maksimal 500 karakter").optional(),
});

// POST /api/company/exit-requests - Karyawan mengajukan keluar dari perusahaan
router.post("/", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const parseResult = exitRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: (parseResult.error as any).errors.map((e: any) => e.message),
      });
    }

    const { company_id, reason } = parseResult.data;

    // Resolve tenant / company
    const tenant = await resolveTenant(req, user.id);
    const targetCompanyId = company_id || tenant?.companyId;

    if (!targetCompanyId) {
      return res.status(400).json({
        success: false,
        message: "Perusahaan tidak ditemukan atau Anda belum tergabung dalam perusahaan manapun.",
      });
    }

    // Check membership in target company
    const memberCheckRes = await db.execute(sql`
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

    const memberRole = (memberCheckRes.rows[0].role as string || "member").toLowerCase();

    // Owner cannot exit directly
    if (memberRole === "owner") {
      return res.status(400).json({
        success: false,
        message: "Pemilik (Owner) tidak dapat mengajukan keluar langsung. Silakan alihkan kepemilikan atau hapus perusahaan terlebih dahulu.",
      });
    }

    // Check if user already has a pending exit request for this company
    const existingReqRes = await db.execute(sql`
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
    const insertRes = await db.execute(sql`
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
    const managersRes = await db.execute(sql`
      SELECT profile_id
      FROM company_members
      WHERE company_id = ${targetCompanyId}
        AND role IN ('owner', 'admin', 'manager')
        AND status = 'active'
        AND deleted_at IS NULL
        AND profile_id != ${user.id}
    `);

    const requesterRes = await db.execute(sql`
      SELECT full_name, email FROM profiles WHERE id = ${user.id}
    `);
    const requesterName = requesterRes.rows[0]?.full_name || requesterRes.rows[0]?.email || "Karyawan";

    for (const row of managersRes.rows) {
      try {
        await db.execute(sql`
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
      } catch (e) {
        console.error("Gagal mengirim notifikasi ke pengelola:", e);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Permohonan keluar berhasil diajukan dan menunggu konfirmasi Admin/Manager.",
      data: exitRequest,
    });
  } catch (error: any) {
    console.error("Create exit request error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

// GET /api/company/exit-requests/me - Status permohonan keluar milik user saat ini
router.get("/me", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const tenant = await resolveTenant(req, user.id);
    const targetCompanyId = (req.query.company_id as string) || (req.headers["x-company-id"] as string) || tenant?.companyId;

    if (!targetCompanyId) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    const reqRes = await db.execute(sql`
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
  } catch (error: any) {
    console.error("Get exit request me error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

// POST /api/company/exit-requests/cancel - Batalkan permohonan keluar oleh user sendiri
router.post("/cancel", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const tenant = await resolveTenant(req, user.id);
    const targetCompanyId = (req.body.company_id as string) || (req.headers["x-company-id"] as string) || tenant?.companyId;

    if (!targetCompanyId) {
      return res.status(400).json({
        success: false,
        message: "Perusahaan tidak valid.",
      });
    }

    const updateRes = await db.execute(sql`
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
  } catch (error: any) {
    console.error("Cancel exit request error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

// GET /api/company/exit-requests - Daftar permohonan keluar untuk Admin/Manager di Kelola Karyawan
router.get("/", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const tenant = await resolveTenant(req, user.id);

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
    const { limit, offset } = parsePaginationParams(req.query, 10, 100);
    const { search } = req.query;

    let searchCondition = sql``;
    if (search && typeof search === 'string' && search.trim() !== '') {
      const s = `%${search.trim().toLowerCase()}%`;
      searchCondition = sql`AND (
        LOWER(p.full_name) LIKE ${s}
        OR LOWER(p.email) LIKE ${s}
        OR LOWER(COALESCE(cer.reason, '')) LIKE ${s}
      )`;
    }

    // 1. Total count
    const countRes = await db.execute(sql`
      SELECT count(*)::int as total
      FROM company_exit_requests cer
      JOIN profiles p ON p.id = cer.profile_id
      WHERE cer.company_id = ${companyId}
        AND cer.status = 'pending'
        AND cer.deleted_at IS NULL
        ${searchCondition}
    `);
    const total = Number(countRes.rows[0]?.total || 0);

    const listRes = await db.execute(sql`
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

    const pagination = buildPaginationMeta(total, limit, offset);

    return res.status(200).json({
      success: true,
      data: listRes.rows,
      pagination,
      meta: pagination
    });
  } catch (error: any) {
    console.error("Get exit requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

// POST /api/company/exit-requests/:requestId/approve - Admin/Manager mengonfirmasi pengeluaran karyawan
router.post("/:requestId/approve", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const { requestId } = req.params;
    const tenant = await resolveTenant(req, user.id);

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
    const reqRes = await db.execute(sql`
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
    const targetProfileId = exitReq.profile_id as string;
    const targetRole = (exitReq.target_role as string || "member").toLowerCase();

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
    await db.execute(sql`
      UPDATE company_exit_requests
      SET 
        status = 'approved',
        reviewed_by = ${user.id},
        reviewed_at = ${nowIso},
        updated_at = ${nowIso}
      WHERE id = ${requestId}
    `);

    // 2. Soft delete member from company_members
    await db.execute(sql`
      UPDATE company_members
      SET 
        status = 'inactive',
        deleted_at = ${nowIso}
      WHERE company_id = ${companyId}
        AND profile_id = ${targetProfileId}
    `);

    // 3. Clear legacy profile company_id if matched
    await db.execute(sql`
      UPDATE profiles
      SET company_id = NULL
      WHERE id = ${targetProfileId}
        AND company_id = ${companyId}
    `);

    // 4. Clear any join requests for this employee in this company
    await db.execute(sql`
      UPDATE company_join_requests
      SET deleted_at = ${nowIso}
      WHERE company_id = ${companyId}
        AND profile_id = ${targetProfileId}
        AND deleted_at IS NULL
    `);

    // 4. Send notification to the user
    try {
      const approverProfileRes = await db.execute(sql`
        SELECT full_name, email FROM profiles WHERE id = ${user.id}
      `);
      const approverName = approverProfileRes.rows[0]?.full_name || approverProfileRes.rows[0]?.email || "Manajemen";

      const memberProfileRes = await db.execute(sql`
        SELECT full_name, email FROM profiles WHERE id = ${targetProfileId}
      `);
      const memberName = memberProfileRes.rows[0]?.full_name || memberProfileRes.rows[0]?.email || "Karyawan";

      await db.execute(sql`
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
    } catch (notifErr) {
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
  } catch (error: any) {
    console.error("Approve exit request error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      errors: [error.message],
    });
  }
});

// POST /api/company/exit-requests/:requestId/reject - Admin/Manager menolak permohonan keluar
router.post("/:requestId/reject", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const { requestId } = req.params;
    const tenant = await resolveTenant(req, user.id);

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
    const reqRes = await db.execute(sql`
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
    const targetProfileId = exitReq.profile_id as string;

    // Prevent rejecting own exit request
    if (user.id === targetProfileId) {
      return res.status(400).json({
        success: false,
        message: "Anda tidak dapat menolak permohonan keluar Anda sendiri. Gunakan tombol batalkan.",
      });
    }

    const nowIso = new Date().toISOString();

    // 1. Update exit request to 'rejected'
    await db.execute(sql`
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
      await db.execute(sql`
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
    } catch (notifErr) {
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
  } catch (error: any) {
    console.error("Reject exit request error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      errors: [error.message],
    });
  }
});

export default router;
