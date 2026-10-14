import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "../db";
import { sql, eq } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { companies, profiles } from "../db/schema";
import multer from "multer";
import { uploadCompanyPhoto } from "../utils/storage";
import { resolveTenant } from "../utils/tenant";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

const createCompanySchema = z.object({ 
  name: z.string().min(1, "Nama perusahaan wajib diisi"),
  address: z.string().min(1, "Alamat wajib diisi"),
  category_id: z.string().uuid().optional().nullable(),
  category_code: z.enum(["community", "organization", "business"]).optional(),
});

const updateCompanySchema = z.object({
  name: z.string().min(1, "Nama perusahaan tidak boleh kosong").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  work_days: z.array(z.string()).optional(),
  work_start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, "Format waktu harus HH:mm atau HH:mm:ss").optional(),
  work_end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, "Format waktu harus HH:mm atau HH:mm:ss").optional(),
}).refine(data => 
  data.name !== undefined || 
  data.phone !== undefined ||
  data.address !== undefined || 
  data.latitude !== undefined || 
  data.longitude !== undefined ||
  data.work_days !== undefined ||
  data.work_start_time !== undefined ||
  data.work_end_time !== undefined, 
{
  message: "Minimal satu field harus diisi"
});

const roleUpdateSchema = z.object({
  roles: z.array(z.enum(["Employee", "Manager", "Admin"]))
}).refine(data => data.roles.includes("Employee"), {
  message: "Role Employee wajib disertakan"
});

// GET /api/companies/categories
router.get("/categories", async (req: Request, res: Response): Promise<any> => {
  try {
    const catsRes = await db.execute(sql`
      SELECT id, code, name, description 
      FROM company_categories 
      ORDER BY name ASC
    `);
    return res.status(200).json({
      success: true,
      data: catsRes.rows
    });
  } catch (error: any) {
    console.error("Get company categories error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /api/companies/memberships - Get all active company memberships for current user
router.get("/memberships", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;

    // 1. Auto-sync legacy profile company_id into company_members if not exists yet
    await db.execute(sql`
      INSERT INTO company_members (id, company_id, profile_id, role, status, joined_at)
      SELECT 
        gen_random_uuid(), 
        p.company_id, 
        p.id, 
        CASE 
          WHEN EXISTS (SELECT 1 FROM companies c WHERE c.id = p.company_id AND c.created_by = p.id) THEN 'owner'
          WHEN EXISTS (SELECT 1 FROM profile_roles pr WHERE pr.profile_id = p.id AND pr.role = 'Admin') THEN 'admin'
          WHEN EXISTS (SELECT 1 FROM profile_roles pr WHERE pr.profile_id = p.id AND pr.role = 'Manager') THEN 'manager'
          ELSE 'member'
        END,
        'active', 
        now()
      FROM profiles p
      WHERE p.id = ${user.id} 
        AND p.company_id IS NOT NULL 
        AND p.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM company_members cm 
          WHERE cm.company_id = p.company_id AND cm.profile_id = p.id
        )
      ON CONFLICT (company_id, profile_id) DO NOTHING
    `);

    // 2. Fetch all active memberships
    const membersRes = await db.execute(sql`
      SELECT 
        cm.id,
        cm.company_id,
        cm.profile_id,
        cm.role,
        cm.status,
        cm.joined_at,
        cm.deleted_at,
        c.id as comp_id,
        c.name as comp_name,
        c.category_id as comp_category_id,
        c.avatar_company_url as comp_avatar_url,
        c.join_code as comp_join_code,
        cc.id as cat_id,
        cc.code as cat_code,
        cc.name as cat_name,
        cc.description as cat_description
      FROM company_members cm
      JOIN companies c ON c.id = cm.company_id
      LEFT JOIN company_categories cc ON cc.id = c.category_id
      WHERE cm.profile_id = ${user.id} 
        AND cm.status = 'active' 
        AND cm.deleted_at IS NULL
        AND c.deleted_at IS NULL
      ORDER BY cm.joined_at DESC
    `);

    const formatted = membersRes.rows.map((row: any) => ({
      id: row.id,
      company_id: row.company_id,
      profile_id: row.profile_id,
      role: (row.role || "member").toLowerCase(),
      status: row.status,
      joined_at: row.joined_at,
      deleted_at: row.deleted_at,
      company: {
        id: row.comp_id,
        name: row.comp_name,
        category_id: row.comp_category_id,
        avatar_company_url: row.comp_avatar_url,
        join_code: row.comp_join_code,
        category: row.cat_id ? {
          id: row.cat_id,
          code: row.cat_code,
          name: row.cat_name,
          description: row.cat_description,
        } : null
      }
    }));

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil daftar membership perusahaan",
      data: formatted
    });
  } catch (error: any) {
    console.error("Get company memberships error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", errors: [error.message] });
  }
});

router.post("/", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;

    const parseResult = createCompanySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: parseResult.error.issues.map((e) => e.message),
      });
    }

    const { name, address, category_id, category_code } = parseResult.data;

    let targetCategoryId = category_id;
    if (!targetCategoryId && category_code) {
      const catRes = await db.execute(sql`
        SELECT id FROM company_categories WHERE code = ${category_code} LIMIT 1
      `);
      if (catRes.rows.length > 0) {
        targetCategoryId = catRes.rows[0].id as string;
      }
    }

    // Generate unique join_code (6 uppercase alphanumeric characters)
    const generateJoinCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    const joinCode = generateJoinCode();

    // Use transaction
    const result = await db.transaction(async (tx) => {
      // 1. Insert company
      const newCompanyRes = await tx.execute(sql`
        INSERT INTO companies (id, name, address, join_code, category_id, created_by)
        VALUES (gen_random_uuid(), ${name}, ${address}, ${joinCode}, ${targetCategoryId || null}, ${user.id})
        RETURNING *
      `);
      const newCompany = newCompanyRes.rows[0];

      // 2. Insert creator into company_members as 'owner'
      await tx.execute(sql`
        INSERT INTO company_members (id, company_id, profile_id, role, status, joined_at)
        VALUES (gen_random_uuid(), ${newCompany.id}, ${user.id}, 'owner', 'active', now())
        ON CONFLICT (company_id, profile_id) 
        DO UPDATE SET role = 'owner', status = 'active', deleted_at = NULL
      `);

      // 3. Set profiles.company_id for backward compatibility
      await tx.execute(sql`
        UPDATE profiles
        SET company_id = ${newCompany.id}
        WHERE id = ${user.id}
      `);

      // 4. Add Employee and Admin roles
      await tx.execute(sql`
        INSERT INTO profile_roles (profile_id, role)
        SELECT ${user.id}, 'Employee'
        WHERE NOT EXISTS (SELECT 1 FROM profile_roles WHERE profile_id = ${user.id} AND role = 'Employee')
      `);
      await tx.execute(sql`
        INSERT INTO profile_roles (profile_id, role)
        SELECT ${user.id}, 'Admin'
        WHERE NOT EXISTS (SELECT 1 FROM profile_roles WHERE profile_id = ${user.id} AND role = 'Admin')
      `);

      return newCompany;
    });

    return res.status(201).json({
      success: true,
      message: "Perusahaan berhasil dibuat",
      data: result,
    });
  } catch (error: any) {
    console.error("Create company error:", error);

    // Handle unique constraint violation on join_code
    if (error.code === "23505" && error.constraint === "companies_join_code_unique") {
      return res.status(500).json({
        success: false,
        message: "Gagal membuat kode unik, silakan coba lagi",
        errors: [error.message],
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

router.get("/me", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const tenant = await resolveTenant(req, user.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Perusahaan tidak ditemukan",
      });
    }

    const companyId = tenant.companyId;

    const companyRes = await db.execute(sql`
      SELECT c.*, cc.name as category_name, cc.code as category_code
      FROM companies c
      LEFT JOIN company_categories cc ON cc.id = c.category_id
      WHERE c.id = ${companyId} AND c.deleted_at IS NULL
    `);

    if (companyRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Perusahaan tidak ditemukan",
      });
    }

    const company = companyRes.rows[0];

    const memberCountRes = await db.execute(sql`
      SELECT count(*) as count 
      FROM company_members 
      WHERE company_id = ${companyId} AND status = 'active' AND deleted_at IS NULL
    `);
    
    const memberCount = parseInt(memberCountRes.rows[0].count as string) || 0;

    return res.status(200).json({
      success: true,
      message: "Berhasil mendapatkan data perusahaan",
      data: {
        ...company,
        role: tenant.role,
        memberCount,
      }
    });

  } catch (error: any) {
    console.error("Get company me error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

// GET /api/companies/members - Daftar anggota aktif perusahaan untuk mention/tugas
router.get("/members", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const tenant = await resolveTenant(req, user.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Perusahaan tidak ditemukan atau Anda belum bergabung dengan perusahaan",
      });
    }

    const companyId = tenant.companyId;

    const membersRes = await db.execute(sql`
      SELECT 
        p.id, 
        p.full_name, 
        p.email, 
        p.avatar_url,
        cm.role
      FROM company_members cm
      JOIN profiles p ON p.id = cm.profile_id
      WHERE cm.company_id = ${companyId}
        AND cm.status = 'active'
        AND cm.deleted_at IS NULL
      ORDER BY p.full_name ASC
    `);

    return res.status(200).json({
      success: true,
      data: membersRes.rows,
    });
  } catch (error: any) {
    console.error("Get company members error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/employees", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const tenant = await resolveTenant(req, user.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Perusahaan tidak ditemukan atau Anda belum bergabung dengan perusahaan",
      });
    }

    if (!tenant.isManagement) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Akses ditolak. Hanya Owner/Admin/Manager yang dapat melihat daftar karyawan.",
      });
    }

    const companyId = tenant.companyId;

    // Fetch members from company_members where deleted_at IS NULL
    const membersRes = await db.execute(sql`
      SELECT 
        p.id, 
        p.full_name, 
        p.email, 
        p.avatar_url,
        cm.role,
        cm.status,
        cm.joined_at
      FROM company_members cm
      JOIN profiles p ON p.id = cm.profile_id
      WHERE cm.company_id = ${companyId}
        AND cm.status = 'active'
        AND cm.deleted_at IS NULL
      ORDER BY cm.joined_at ASC
    `);
    
    const employees = membersRes.rows.map((row: any) => {
      const cmRole = (row.role || "member").toLowerCase();
      let userRoles: string[] = ["Employee"];
      if (cmRole === "owner") {
        userRoles = ["Owner", "Admin", "Employee"];
      } else if (cmRole === "admin") {
        userRoles = ["Admin", "Employee"];
      } else if (cmRole === "manager") {
        userRoles = ["Manager", "Employee"];
      } else {
        userRoles = ["Employee"];
      }

      return {
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        avatar_url: row.avatar_url,
        role: cmRole,
        roles: userRoles
      };
    });

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil daftar karyawan",
      data: employees,
      meta: {
        total: employees.length
      }
    });

  } catch (error: any) {
    console.error("Get company employees error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

// Soft Delete a member from the company
router.delete("/employees/:employeeId", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const { employeeId } = req.params;
    const tenant = await resolveTenant(req, user.id);

    if (!tenant) {
      return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
    }

    if (!tenant.isManagement) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Hanya Owner, Admin, atau Manager yang dapat menghapus/mengeluarkan anggota.",
      });
    }

    if (user.id === employeeId) {
      return res.status(400).json({
        success: false,
        message: "Anda tidak dapat menghapus akun Anda sendiri dari perusahaan.",
      });
    }

    const companyId = tenant.companyId;

    // Check target member
    const targetRes = await db.execute(sql`
      SELECT role FROM company_members
      WHERE company_id = ${companyId} AND profile_id = ${employeeId} AND deleted_at IS NULL
    `);

    if (targetRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Anggota tidak ditemukan atau sudah dihapus." });
    }

    const targetRole = (targetRes.rows[0].role as string || "member").toLowerCase();

    // Role hierarchy checks
    if (tenant.role === "admin" && (targetRole === "owner" || targetRole === "admin")) {
      return res.status(403).json({ success: false, message: "Admin tidak dapat mengeluarkan Owner atau sesama Admin." });
    }
    if (tenant.role === "manager" && (targetRole === "owner" || targetRole === "admin" || targetRole === "manager")) {
      return res.status(403).json({ success: false, message: "Manager hanya dapat mengeluarkan anggota (karyawan)." });
    }

    // Soft delete member: set deleted_at = now()
    const nowIso = new Date().toISOString();
    await db.execute(sql`
      UPDATE company_members
      SET deleted_at = ${nowIso}, status = 'inactive'
      WHERE company_id = ${companyId} AND profile_id = ${employeeId}
    `);

    // Clear legacy profile company_id if it matched
    await db.execute(sql`
      UPDATE profiles
      SET company_id = NULL
      WHERE id = ${employeeId} AND company_id = ${companyId}
    `);

    // Clear any join requests for this employee in this company
    await db.execute(sql`
      UPDATE company_join_requests
      SET deleted_at = ${nowIso}
      WHERE company_id = ${companyId} AND profile_id = ${employeeId} AND deleted_at IS NULL
    `);

    // Send notification to the removed member
    try {
      const removerRes = await db.execute(sql`
        SELECT full_name, email FROM profiles WHERE id = ${user.id}
      `);
      const removerName = removerRes.rows[0]?.full_name || removerRes.rows[0]?.email || "Manajemen";

      const empRes = await db.execute(sql`
        SELECT full_name, email FROM profiles WHERE id = ${employeeId}
      `);
      const empName = empRes.rows[0]?.full_name || empRes.rows[0]?.email || "Anggota";

      await db.execute(sql`
        INSERT INTO notifications (
          id, company_id, recipient_id, type, title, message, is_read, created_at
        )
        VALUES (
          gen_random_uuid(),
          ${companyId},
          ${employeeId},
          'member_removed',
          'Pemberitahuan Keanggotaan',
          ${`Keanggotaan atas nama ${empName} telah dinonaktifkan oleh ${removerName}.`},
          false,
          now()
        )
      `);
    } catch (notifErr) {
      console.error("Gagal mengirim notifikasi pengeluaran:", notifErr);
    }

    return res.status(200).json({
      success: true,
      message: "Anggota berhasil dikeluarkan dari perusahaan (soft delete)",
      data: { employee_id: employeeId, deleted_at: nowIso }
    });
  } catch (error: any) {
    console.error("Delete employee error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error", errors: [error.message] });
  }
});



router.patch("/me", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;

    const parseResult = updateCompanySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: parseResult.error.issues.map((e) => e.message),
      });
    }

    const { name, phone, address, latitude, longitude, work_days } = parseResult.data;
    let { work_start_time, work_end_time } = parseResult.data;

    if (work_start_time) {
      work_start_time = work_start_time.split(':').slice(0, 2).join(':');
    }
    if (work_end_time) {
      work_end_time = work_end_time.split(':').slice(0, 2).join(':');
    }

    const tenant = await resolveTenant(req, user.id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Perusahaan tidak ditemukan atau Anda belum bergabung dengan perusahaan",
      });
    }

    if (!tenant.isManagement || tenant.role === "member") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Anda tidak memiliki akses untuk mengubah pengaturan perusahaan",
      });
    }

    const companyId = tenant.companyId;

    const updates = [];
    if (name !== undefined) updates.push(sql`name = ${name}`);
    if (phone !== undefined) updates.push(sql`phone = ${phone}`);
    if (address !== undefined) updates.push(sql`address = ${address}`);
    if (latitude !== undefined) updates.push(sql`latitude = ${latitude}`);
    if (longitude !== undefined) updates.push(sql`longitude = ${longitude}`);
    if (work_days !== undefined) {
      if (Array.isArray(work_days)) {
        if (work_days.length > 0) {
          const arrayElements = work_days.map((d: string) => sql`${d}`);
          updates.push(sql`work_days = ARRAY[${sql.join(arrayElements, sql`, `)}]::text[]`);
        } else {
          updates.push(sql`work_days = ARRAY[]::text[]`);
        }
      }
    }
    if (work_start_time !== undefined) updates.push(sql`work_start_time = ${work_start_time}`);
    if (work_end_time !== undefined) updates.push(sql`work_end_time = ${work_end_time}`);

    const updateQuery = sql`
      UPDATE companies 
      SET ${sql.join(updates, sql`, `)}
      WHERE id = ${companyId}
      RETURNING *
    `;

    const updateRes = await db.execute(updateQuery);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Perusahaan tidak ditemukan",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Data perusahaan berhasil diperbarui",
      data: updateRes.rows[0],
    });

  } catch (error: any) {
    console.error("Update company error:", error);
    console.error(error.stack);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

// PATCH /api/companies/employees/:employeeId/roles
router.patch("/employees/:employeeId/roles", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const { employeeId } = req.params;

    const parseResult = roleUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: parseResult.error.issues.map((e) => e.message),
      });
    }
    const { roles } = parseResult.data;

    // 1. Resolve tenant for active company and verify management authorization
    const tenant = await resolveTenant(req, user.id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Perusahaan tidak ditemukan atau Anda belum bergabung dengan perusahaan",
      });
    }

    if (!tenant.isManagement || (tenant.role !== "owner" && tenant.role !== "admin")) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Hanya Owner atau Admin yang dapat mengubah hak akses",
      });
    }

    const companyId = tenant.companyId;

    // Self Role Safety: Admin cannot revoke their own Admin access
    if (user.id === employeeId && !roles.includes("Admin")) {
      return res.status(400).json({
        success: false,
        message: "Anda tidak dapat menghapus akses Admin milik Anda sendiri",
      });
    }

    // 2. Verify target employee in active company
    const targetMemberRes = await db.execute(sql`
      SELECT cm.role, cm.status, p.id
      FROM company_members cm
      JOIN profiles p ON p.id = cm.profile_id
      WHERE cm.company_id = ${companyId}
        AND cm.profile_id = ${employeeId}
        AND cm.deleted_at IS NULL
        AND p.deleted_at IS NULL
      LIMIT 1
    `);

    if (targetMemberRes.rows.length === 0 || targetMemberRes.rows[0].status !== "active") {
      return res.status(404).json({
        success: false,
        message: "Karyawan tidak ditemukan dalam perusahaan ini",
      });
    }

    const currentTargetRole = (targetMemberRes.rows[0].role as string || "member").toLowerCase();

    // 3. Do not allow changing Owner role through employee role update
    if (currentTargetRole === "owner") {
      return res.status(400).json({
        success: false,
        message: "Role Owner tidak dapat diubah melalui alur perubahan role karyawan",
      });
    }

    // 4. Determine roles to set: always preserve Employee role
    const rolesToSet = Array.from(new Set(["Employee", ...roles]));
    let targetCompanyRole: "admin" | "manager" | "member" = "member";
    if (rolesToSet.includes("Admin")) {
      targetCompanyRole = "admin";
    } else if (rolesToSet.includes("Manager")) {
      targetCompanyRole = "manager";
    } else {
      targetCompanyRole = "member";
    }

    // 5. Update both company_members and profile_roles in a single transaction
    await db.transaction(async (tx) => {
      await tx.execute(sql`
        UPDATE company_members
        SET role = ${targetCompanyRole}, updated_at = now()
        WHERE company_id = ${companyId}
          AND profile_id = ${employeeId}
          AND role != 'owner'
          AND deleted_at IS NULL
      `);

      await tx.execute(sql`
        DELETE FROM profile_roles WHERE profile_id = ${employeeId}
      `);

      for (const role of rolesToSet) {
        await tx.execute(sql`
          INSERT INTO profile_roles (profile_id, role)
          VALUES (${employeeId}, ${role})
        `);
      }
    });

    return res.status(200).json({
      success: true,
      message: "Hak akses berhasil diperbarui",
      data: {
        employee_id: employeeId,
        company_id: companyId,
        role: targetCompanyRole,
        roles: rolesToSet,
      }
    });
  } catch (error: any) {
    console.error("Update employee roles error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

router.post("/avatar", authenticate, upload.single("avatar"), async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: "File foto tidak ditemukan." });
    }

    // 1. Resolve tenant & check authorization
    const tenant = await resolveTenant(req, user.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Anda tidak terhubung ke perusahaan manapun" });
    }

    if (!tenant.isManagement) {
      return res.status(403).json({ success: false, message: "Forbidden: Hanya Pemilik, Admin, atau Manager yang dapat mengubah foto perusahaan" });
    }

    const companyId = tenant.companyId;

    // 2. Upload photo to Supabase
    let photoUrl;
    try {
      photoUrl = await uploadCompanyPhoto(file.buffer, file.mimetype, companyId);
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }

    // 3. Update company with new avatar URL
    const updateRes = await db.update(companies)
      .set({ avatar_company_url: photoUrl })
      .where(eq(companies.id, companyId))
      .returning();

    if (!updateRes.length) {
      return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
    }

    return res.status(200).json({
      success: true,
      message: "Foto perusahaan berhasil diperbarui",
      data: { avatar_company_url: photoUrl },
    });
  } catch (error: any) {
    console.error("Upload company avatar error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});


export default router;
