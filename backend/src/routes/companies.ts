import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "../db";
import { sql, eq } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { companies, profiles } from "../db/schema";
import multer from "multer";
import { uploadCompanyPhoto } from "../utils/storage";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

const createCompanySchema = z.object({
  name: z.string().min(1, "Nama perusahaan wajib diisi"),
  address: z.string().min(1, "Alamat wajib diisi"),
});

const updateCompanySchema = z.object({
  name: z.string().min(1, "Nama perusahaan tidak boleh kosong").optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).refine(data => data.name !== undefined || data.address !== undefined || data.latitude !== undefined || data.longitude !== undefined, {
  message: "Minimal satu field harus diisi"
});

const roleUpdateSchema = z.object({
  roles: z.array(z.enum(["Employee", "Manager", "Admin"]))
}).refine(data => data.roles.includes("Employee"), {
  message: "Role Employee wajib disertakan"
});


router.post("/", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;

    const parseResult = createCompanySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: (parseResult.error as any).errors.map((e: any) => e.message),
      });
    }

    const { name, address } = parseResult.data;

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
        INSERT INTO companies (id, name, address, join_code, created_by)
        VALUES (gen_random_uuid(), ${name}, ${address}, ${joinCode}, ${user.id})
        RETURNING *
      `);
      const newCompany = newCompanyRes.rows[0];

      // 2. Set profiles.company_id
      await tx.execute(sql`
        UPDATE profiles
        SET company_id = ${newCompany.id}
        WHERE id = ${user.id}
      `);

      // 3. Add Employee and Admin roles
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

    const profileRes = await db.execute(sql`
      SELECT company_id FROM profiles WHERE id = ${user.id}
    `);
    
    if (profileRes.rows.length === 0 || !profileRes.rows[0].company_id) {
      return res.status(404).json({
        success: false,
        message: "Perusahaan tidak ditemukan",
      });
    }

    const companyId = profileRes.rows[0].company_id;

    const companyRes = await db.execute(sql`
      SELECT * FROM companies WHERE id = ${companyId}
    `);

    if (companyRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Perusahaan tidak ditemukan",
      });
    }

    const company = companyRes.rows[0];

    const memberCountRes = await db.execute(sql`
      SELECT count(*) as count FROM profiles WHERE company_id = ${companyId}
    `);
    
    const memberCount = parseInt(memberCountRes.rows[0].count as string) || 0;

    return res.status(200).json({
      success: true,
      message: "Berhasil mendapatkan data perusahaan",
      data: {
        ...company,
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


router.get("/employees", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;

    const profileRes = await db.execute(sql`
      SELECT company_id FROM profiles WHERE id = ${user.id}
    `);
    
    if (profileRes.rows.length === 0 || !profileRes.rows[0].company_id) {
      return res.status(404).json({
        success: false,
        message: "Perusahaan tidak ditemukan atau Anda belum bergabung dengan perusahaan",
      });
    }

    const companyId = profileRes.rows[0].company_id;

    const roleRes = await db.execute(sql`
      SELECT role FROM profile_roles WHERE profile_id = ${user.id} AND role = 'Admin'
    `);

    if (roleRes.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Akses ditolak. Hanya Admin yang dapat melihat daftar karyawan.",
      });
    }

    const employeesRes = await db.execute(sql`
      SELECT id, full_name, email, avatar_url
      FROM profiles
      WHERE company_id = ${companyId}
    `);
    
    const rolesRes = await db.execute(sql`
      SELECT pr.profile_id, pr.role
      FROM profile_roles pr
      JOIN profiles p ON p.id = pr.profile_id
      WHERE p.company_id = ${companyId}
    `);
    
    const rolesMap: Record<string, string[]> = {};
    for (const row of rolesRes.rows) {
      const pid = row.profile_id as string;
      if (!rolesMap[pid]) {
        rolesMap[pid] = [];
      }
      rolesMap[pid].push(row.role as string);
    }
    
    const employees = employeesRes.rows.map((row: any) => {
      const userRoles = rolesMap[row.id] || [];
      if (!userRoles.includes('Employee')) {
        userRoles.unshift('Employee');
      }
      return {
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        avatar_url: row.avatar_url,
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


router.patch("/me", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;

    const parseResult = updateCompanySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: (parseResult.error as any).errors.map((e: any) => e.message),
      });
    }

    const { name, address, latitude, longitude } = parseResult.data;

    const profileRes = await db.execute(sql`
      SELECT company_id FROM profiles WHERE id = ${user.id}
    `);
    
    if (profileRes.rows.length === 0 || !profileRes.rows[0].company_id) {
      return res.status(404).json({
        success: false,
        message: "Perusahaan tidak ditemukan atau Anda belum bergabung dengan perusahaan",
      });
    }

    const companyId = profileRes.rows[0].company_id;

    const roleRes = await db.execute(sql`
      SELECT role FROM profile_roles WHERE profile_id = ${user.id} AND role = 'Admin'
    `);

    if (roleRes.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Anda tidak memiliki akses untuk mengubah pengaturan perusahaan",
      });
    }

    const updates = [];
    if (name !== undefined) updates.push(sql`name = ${name}`);
    if (address !== undefined) updates.push(sql`address = ${address}`);
    if (latitude !== undefined) updates.push(sql`latitude = ${latitude}`);
    if (longitude !== undefined) updates.push(sql`longitude = ${longitude}`);

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
        errors: (parseResult.error as any).errors.map((e: any) => e.message),
      });
    }
    const { roles } = parseResult.data;

    // 1. Get Admin's company_id
    const adminProfileRes = await db.execute(sql`
      SELECT company_id FROM profiles WHERE id = ${user.id}
    `);
    
    if (adminProfileRes.rows.length === 0 || !adminProfileRes.rows[0].company_id) {
      return res.status(404).json({
        success: false,
        message: "Anda tidak terhubung ke perusahaan manapun",
      });
    }
    const companyId = adminProfileRes.rows[0].company_id;

    // 2. Verify if user is an Admin
    const roleRes = await db.execute(sql`
      SELECT role FROM profile_roles WHERE profile_id = ${user.id} AND role = 'Admin'
    `);
    if (roleRes.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Hanya Admin yang dapat mengubah hak akses",
      });
    }

    // Self Role Safety
    if (user.id === employeeId && !roles.includes('Admin')) {
      return res.status(400).json({
        success: false,
        message: "Anda tidak dapat menghapus akses Admin milik Anda sendiri",
      });
    }

    // 3. Verify target employee
    const targetProfileRes = await db.execute(sql`
      SELECT company_id FROM profiles WHERE id = ${employeeId} AND deleted_at IS NULL
    `);
    if (targetProfileRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Karyawan tidak ditemukan",
      });
    }
    if (targetProfileRes.rows[0].company_id !== companyId) {
      return res.status(403).json({
        success: false,
        message: "Karyawan bukan bagian dari perusahaan Anda",
      });
    }

    // 4. Update roles using transaction
    await db.transaction(async (tx) => {
      await tx.execute(sql`
        DELETE FROM profile_roles WHERE profile_id = ${employeeId}
      `);
      
      for (const role of roles) {
        await tx.execute(sql`
          INSERT INTO profile_roles (profile_id, role)
          VALUES (${employeeId}, ${role})
        `);
      }
    });

    return res.status(200).json({
      success: true,
      message: "Hak akses berhasil diperbarui",
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

    // 1. Get Admin's company_id
    const profileRes = await db.execute(sql`
      SELECT company_id FROM profiles WHERE id = ${user.id}
    `);
    
    if (profileRes.rows.length === 0 || !profileRes.rows[0].company_id) {
      return res.status(404).json({ success: false, message: "Anda tidak terhubung ke perusahaan manapun" });
    }
    const companyId = profileRes.rows[0].company_id as string;

    // 2. Verify if user is an Admin
    const roleRes = await db.execute(sql`
      SELECT role FROM profile_roles WHERE profile_id = ${user.id} AND role = 'Admin'
    `);
    if (roleRes.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Forbidden: Hanya Admin yang dapat mengubah foto perusahaan" });
    }

    // 3. Upload photo to Supabase
    let photoUrl;
    try {
      photoUrl = await uploadCompanyPhoto(file.buffer, file.mimetype, companyId);
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }

    // 4. Update company with new avatar URL
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
