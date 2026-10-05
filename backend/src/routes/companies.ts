import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth";

const router = Router();

const createCompanySchema = z.object({
  name: z.string().min(1, "Nama perusahaan wajib diisi"),
  address: z.string().min(1, "Alamat wajib diisi"),
});



router.post("/", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;

    const parseResult = createCompanySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: parseResult.error.errors.map((e) => e.message),
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

      // 3. Add Admin role
      await tx.execute(sql`
        INSERT INTO profile_roles (profile_id, role)
        VALUES (${user.id}, 'Admin')
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

export default router;
