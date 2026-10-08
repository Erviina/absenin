import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { notifications } from "../db/schema";

const router = Router();

const joinRequestSchema = z.object({
  join_code: z.string().min(1, "Join code wajib diisi"),
});



// POST /api/company/join-requests
router.post("/", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;

    const parseResult = joinRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: (parseResult.error as any).errors.map((e: any) => e.message),
      });
    }

    const { join_code } = parseResult.data;

    // 1. Check if company exists
    const companyRes = await db.execute(sql`
      SELECT id FROM companies WHERE join_code = ${join_code}
    `);

    if (companyRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Kode join tidak valid",
        errors: ["Perusahaan tidak ditemukan dengan kode tersebut"],
      });
    }

    const companyId = companyRes.rows[0].id as string;

    // 2. Check if user already has a company
    const profileRes = await db.execute(sql`
      SELECT company_id FROM profiles WHERE id = ${user.id}
    `);

    if (profileRes.rows.length > 0 && profileRes.rows[0].company_id) {
      return res.status(400).json({
        success: false,
        message: "Anda sudah tergabung dalam sebuah perusahaan",
        errors: [],
      });
    }

    // 3. Check if user already has a pending request
    const pendingRes = await db.execute(sql`
      SELECT id FROM company_join_requests 
      WHERE profile_id = ${user.id} AND status = 'pending' AND deleted_at IS NULL
    `);

    if (pendingRes.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Anda sudah memiliki request yang masih pending",
        errors: [],
      });
    }

    // 4. Create the join request
    const insertRes = await db.execute(sql`
      INSERT INTO company_join_requests (id, profile_id, company_id, status, created_by, created_at, updated_at)
      VALUES (gen_random_uuid(), ${user.id}, ${companyId}, 'pending', ${user.id}, now(), now())
      RETURNING *
    `);

    const joinRequest = insertRes.rows[0];

    // 5. Send notification to Admins
    const adminsRes = await db.execute(sql`
      SELECT pr.profile_id
      FROM profile_roles pr
      JOIN profiles p ON p.id = pr.profile_id
      WHERE p.company_id = ${companyId} AND pr.role = 'Admin'
    `);

    const requesterRes = await db.execute(sql`
      SELECT full_name, email FROM profiles WHERE id = ${user.id}
    `);
    const requesterName = requesterRes.rows[0]?.full_name || requesterRes.rows[0]?.email || "User";

    if (adminsRes.rows.length > 0) {
      const notifData = adminsRes.rows.map((admin: any) => ({
        company_id: companyId,
        recipient_id: admin.profile_id as string,
        type: "JOIN_REQUEST_PENDING",
        title: "Permintaan Bergabung",
        message: `${requesterName} mengajukan permintaan bergabung ke perusahaan.`,
        reference_id: joinRequest.id as string,
      }));
      await db.insert(notifications).values(notifData);
    }

    return res.status(201).json({
      success: true,
      message: "Request bergabung berhasil dikirim",
      data: insertRes.rows[0],
    });

  } catch (error: any) {
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
router.get("/me", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;

    const requestRes = await db.execute(sql`
      SELECT cjr.id, cjr.status, cjr.created_at, c.name as company_name 
      FROM company_join_requests cjr
      JOIN companies c ON c.id = cjr.company_id
      WHERE cjr.profile_id = ${user.id} AND cjr.deleted_at IS NULL
      ORDER BY cjr.created_at DESC
      LIMIT 1
    `);

    if (requestRes.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Tidak ada request",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil request",
      data: requestRes.rows[0],
    });

  } catch (error: any) {
    console.error("Get join request me error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

// GET /api/company/join-requests
router.get("/", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;

    // 1. Get user profile and company_id
    const profileRes = await db.execute(sql`
      SELECT id, company_id FROM profiles WHERE id = ${user.id}
    `);

    console.log("=== RUNTIME VERIFICATION ===");
    console.log("1. req.user.id (JWT):", user.id);
    console.log("2. profiles query result:", profileRes.rows);
    console.log("============================");

    if (profileRes.rows.length === 0 || !profileRes.rows[0].company_id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
        errors: ["Anda tidak terhubung ke perusahaan manapun"],
      });
    }

    const companyId = profileRes.rows[0].company_id as string;

    // 2. Verify if user is an Admin
    const roleRes = await db.execute(sql`
      SELECT role FROM profile_roles WHERE profile_id = ${user.id} AND role = 'Admin'
    `);

    console.log("3. role query result:", roleRes.rows);

    if (roleRes.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
        errors: ["Hanya Admin yang diizinkan untuk mengakses daftar request bergabung"],
      });
    }

    // 3. Fetch the join requests for the company
    const requestsRes = await db.execute(sql`
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
      ORDER BY cjr.created_at ASC
    `);

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil daftar request",
      data: requestsRes.rows,
    });

  } catch (error: any) {
    console.error("Get join requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

// POST /api/company/join-requests/:requestId/approve
router.post("/:requestId/approve", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const { requestId } = req.params;

    // 1. Get user profile and company_id
    const profileRes = await db.execute(sql`
      SELECT company_id FROM profiles WHERE id = ${user.id}
    `);

    if (profileRes.rows.length === 0 || !profileRes.rows[0].company_id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
        errors: ["Anda tidak terhubung ke perusahaan manapun"],
      });
    }

    const companyId = profileRes.rows[0].company_id as string;

    // 2. Verify if user is an Admin
    const roleRes = await db.execute(sql`
      SELECT role FROM profile_roles WHERE profile_id = ${user.id} AND role = 'Admin'
    `);

    if (roleRes.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
        errors: ["Hanya Admin yang diizinkan untuk melakukan aksi ini"],
      });
    }

    // 3. Find the join request
    const requestRes = await db.execute(sql`
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
    await db.transaction(async (tx) => {
      // Update join request
      await tx.execute(sql`
        UPDATE company_join_requests 
        SET status = 'approved', reviewed_at = now(), reviewed_by = ${user.id}, updated_at = now()
        WHERE id = ${requestId}
      `);

      // Update user profile
      await tx.execute(sql`
        UPDATE profiles
        SET company_id = ${companyId}
        WHERE id = ${joinRequest.profile_id}
      `);

      // Add Employee role if not exists
      await tx.execute(sql`
        INSERT INTO profile_roles (profile_id, role)
        VALUES (${joinRequest.profile_id}, 'Employee')
        ON CONFLICT DO NOTHING
      `);

      // Create notification
      await tx.insert(notifications).values({
        company_id: companyId,
        recipient_id: joinRequest.profile_id as string,
        type: "JOIN_REQUEST_APPROVED",
        title: "Permintaan Bergabung Disetujui",
        message: "Permintaan bergabung Anda telah disetujui. Selamat datang di perusahaan!",
        reference_id: joinRequest.id as string,
      });
    });

    return res.status(200).json({
      success: true,
      message: "Request berhasil disetujui",
      data: null,
    });

  } catch (error: any) {
    console.error("Approve join request error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

// POST /api/company/join-requests/:requestId/reject
router.post("/:requestId/reject", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const { requestId } = req.params;

    const profileRes = await db.execute(sql`
      SELECT company_id FROM profiles WHERE id = ${user.id}
    `);

    if (profileRes.rows.length === 0 || !profileRes.rows[0].company_id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
        errors: ["Anda tidak terhubung ke perusahaan manapun"],
      });
    }

    const companyId = profileRes.rows[0].company_id as string;

    const roleRes = await db.execute(sql`
      SELECT role FROM profile_roles WHERE profile_id = ${user.id} AND role = 'Admin'
    `);

    if (roleRes.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
        errors: ["Hanya Admin yang diizinkan untuk melakukan aksi ini"],
      });
    }

    const requestRes = await db.execute(sql`
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

    await db.transaction(async (tx) => {
      await tx.execute(sql`
        UPDATE company_join_requests 
        SET status = 'rejected', reviewed_at = now(), reviewed_by = ${user.id}, updated_at = now()
        WHERE id = ${requestId}
      `);

      await tx.insert(notifications).values({
        company_id: companyId,
        recipient_id: joinRequest.profile_id as string,
        type: "JOIN_REQUEST_REJECTED",
        title: "Permintaan Bergabung Ditolak",
        message: "Maaf, permintaan bergabung Anda telah ditolak oleh admin.",
        reference_id: joinRequest.id as string,
      });
    });

    return res.status(200).json({
      success: true,
      message: "Request berhasil ditolak",
      data: null,
    });

  } catch (error: any) {
    console.error("Reject join request error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

export default router;
