import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { faqs, profiles, companies } from "../db/schema";
import { eq, and, sql, desc, asc, isNull } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { resolveTenant } from "../utils/tenant";
import { isPlatformOwnerEmail } from "../middleware/platformAuth";
import { z } from "zod";
import jwt from "jsonwebtoken";

const router = Router();

// Zod Schema untuk Validasi Input FAQ
const createFaqSchema = z.object({
  question: z.string().min(3, "Pertanyaan minimal 3 karakter"),
  answer: z.string().min(5, "Jawaban minimal 5 karakter"),
  category: z.string().min(1, "Kategori wajib diisi").default("Umum"),
  scope: z.enum(["global", "company", "platform_admin"]),
  sop_title: z.string().max(255).optional().nullable(),
  sop_url: z.string().url("URL SOP harus berupa tautan yang valid (http/https)").optional().nullable().or(z.literal("")),
  is_published: z.boolean().default(true),
  order_index: z.number().int().default(0),
});

const updateFaqSchema = createFaqSchema.partial();

// Helper untuk memeriksa apakah user merupakan Platform Owner
async function checkIsPlatformOwner(userId: string, email?: string): Promise<boolean> {
  if (isPlatformOwnerEmail(email)) return true;
  try {
    const res = await db
      .select({ isDeveloper: profiles.is_developer })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);
    return res.length > 0 && res[0].isDeveloper === true;
  } catch (err) {
    console.error("Error checking platform owner in faqs route:", err);
    return false;
  }
}

// Optional Auth middleware: mengekstrak user jika token tersedia, tetapi tidak memblokir pengunjung publik
function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }
  const token = authHeader.split(" ")[1];
  try {
    const secret = process.env.JWT_SECRET;
    if (secret) {
      const payload = jwt.verify(token, secret) as any;
      (req as any).user = { id: payload.sub, email: payload.email };
    }
  } catch (err) {
    // Abaikan jika token tidak valid pada rute opsional
  }
  next();
}

/**
 * GET /api/faqs/categories
 * Mengambil daftar kategori FAQ yang unik
 */
router.get("/categories", optionalAuthenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const categoriesRes = await db.execute(sql`
      SELECT DISTINCT category 
      FROM faqs 
      WHERE deleted_at IS NULL AND is_published = true 
      ORDER BY category ASC;
    `);
    const defaultCategories = ["Umum", "Presensi", "GPS & Lokasi", "Izin & Cuti", "Tugas", "Kebijakan Kantor", "SOP Kerja"];
    const dbCategories = categoriesRes.rows.map((r: any) => r.category).filter(Boolean);
    const combined = Array.from(new Set([...defaultCategories, ...dbCategories]));

    return res.status(200).json({
      success: true,
      data: combined,
    });
  } catch (err: any) {
    console.error("Error fetching FAQ categories:", err);
    return res.status(500).json({ success: false, message: "Gagal mengambil kategori FAQ", errors: [err.message] });
  }
});

/**
 * GET /api/faqs
 * Mengambil daftar FAQ yang dipublikasikan untuk pengguna aplikasi (Profil -> Pusat Bantuan)
 * Sesuai hak akses:
 * - FAQ Global: Tampil untuk semua pengguna.
 * - FAQ Perusahaan: Tampil hanya untuk anggota perusahaan aktif pengguna.
 * - FAQ Platform Admin: Tampil HANYA untuk Platform Owner (isDeveloper === true).
 */
router.get("/", optionalAuthenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const { search, category, scope } = req.query;

    let companyId: string | null = null;
    let isPlatformOwner = false;

    if (user?.id) {
      isPlatformOwner = await checkIsPlatformOwner(user.id, user.email);
      const tenant = await resolveTenant(req, user.id);
      if (tenant?.companyId) {
        companyId = tenant.companyId;
      }
    }

    // Bangun filter akses scope berdasarkan peran pengguna
    let scopeAccessCondition = sql`f.scope = 'global'`;
    if (companyId && isPlatformOwner) {
      scopeAccessCondition = sql`(f.scope = 'global' OR (f.scope = 'company' AND f.company_id = ${companyId}) OR f.scope = 'platform_admin')`;
    } else if (companyId) {
      scopeAccessCondition = sql`(f.scope = 'global' OR (f.scope = 'company' AND f.company_id = ${companyId}))`;
    } else if (isPlatformOwner) {
      scopeAccessCondition = sql`(f.scope = 'global' OR f.scope = 'platform_admin')`;
    }

    // Filter tambahan jika query eksplisit menentukan scope
    let explicitScopeCondition = sql``;
    if (scope && typeof scope === "string") {
      if (scope === "platform_admin" && !isPlatformOwner) {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak: FAQ Platform Admin hanya dapat diakses oleh Platform Owner.",
        });
      }
      if (scope === "company" && !companyId) {
        return res.status(200).json({ success: true, data: [] });
      }
      explicitScopeCondition = sql`AND f.scope = ${scope}`;
    }

    // Filter pencarian
    let searchCondition = sql``;
    if (search && typeof search === "string" && search.trim()) {
      const q = `%${search.trim()}%`;
      searchCondition = sql`AND (f.question ILIKE ${q} OR f.answer ILIKE ${q} OR f.category ILIKE ${q} OR COALESCE(f.sop_title, '') ILIKE ${q})`;
    }

    // Filter kategori
    let categoryCondition = sql``;
    if (category && typeof category === "string" && category !== "Semua" && category.trim()) {
      categoryCondition = sql`AND f.category ILIKE ${category.trim()}`;
    }

    const result = await db.execute(sql`
      SELECT 
        f.id,
        f.company_id,
        f.author_id,
        f.scope,
        f.category,
        f.question,
        f.answer,
        f.sop_title,
        f.sop_url,
        f.is_published,
        f.order_index,
        f.created_at,
        f.updated_at,
        c.name as company_name,
        p.full_name as author_name
      FROM faqs f
      LEFT JOIN companies c ON f.company_id = c.id
      LEFT JOIN profiles p ON f.author_id = p.id
      WHERE f.deleted_at IS NULL
        AND f.is_published = true
        AND ${scopeAccessCondition}
        ${explicitScopeCondition}
        ${searchCondition}
        ${categoryCondition}
      ORDER BY f.order_index ASC, f.created_at DESC;
    `);

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil daftar FAQ publik",
      data: result.rows,
    });
  } catch (err: any) {
    console.error("Get public faqs error:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat daftar FAQ",
      errors: [err.message],
    });
  }
});

/**
 * GET /api/faqs/manage
 * Endpoint manajemen FAQ untuk Platform Owner (Global & Platform Admin) atau Admin Perusahaan (Khusus Perusahaannya)
 * Mengembalikan seluruh status (Draft maupun Terbit)
 */
router.get("/manage", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const { scope, status, search, category } = req.query;

    const isPlatformOwner = await checkIsPlatformOwner(user.id, user.email);
    const tenant = await resolveTenant(req, user.id);

    // Evaluasi otorisasi berdasarkan scope yang diminta
    const requestedScope = (scope as string) || (isPlatformOwner ? "global" : "company");

    if (requestedScope === "global" || requestedScope === "platform_admin") {
      if (!isPlatformOwner) {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak: Hanya Platform Owner yang berwenang mengelola FAQ Global dan Platform Admin.",
        });
      }
    } else if (requestedScope === "company") {
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: "Perusahaan tidak ditemukan atau Anda belum tergabung.",
        });
      }
      if (!tenant.isManagement && !isPlatformOwner) {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak: Hanya Owner, Admin, atau Manager perusahaan yang dapat mengelola FAQ perusahaan.",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Scope tidak valid. Pilihan: 'global', 'company', atau 'platform_admin'.",
      });
    }

    // Filter kondisi query
    let scopeCondition = sql``;
    if (requestedScope === "global") {
      scopeCondition = sql`f.scope = 'global'`;
    } else if (requestedScope === "platform_admin") {
      scopeCondition = sql`f.scope = 'platform_admin'`;
    } else {
      // Isolasi ketat: hanya ambil data perusahaan aktif
      scopeCondition = sql`f.scope = 'company' AND f.company_id = ${tenant!.companyId}`;
    }

    // Filter status publikasi
    let statusCondition = sql``;
    if (status === "published") {
      statusCondition = sql`AND f.is_published = true`;
    } else if (status === "draft") {
      statusCondition = sql`AND f.is_published = false`;
    }

    // Filter search
    let searchCondition = sql``;
    if (search && typeof search === "string" && search.trim()) {
      const q = `%${search.trim()}%`;
      searchCondition = sql`AND (f.question ILIKE ${q} OR f.answer ILIKE ${q} OR f.category ILIKE ${q} OR COALESCE(f.sop_title, '') ILIKE ${q})`;
    }

    // Filter kategori
    let categoryCondition = sql``;
    if (category && typeof category === "string" && category !== "Semua" && category.trim()) {
      categoryCondition = sql`AND f.category ILIKE ${category.trim()}`;
    }

    const result = await db.execute(sql`
      SELECT 
        f.id,
        f.company_id,
        f.author_id,
        f.scope,
        f.category,
        f.question,
        f.answer,
        f.sop_title,
        f.sop_url,
        f.is_published,
        f.order_index,
        f.created_at,
        f.updated_at,
        c.name as company_name,
        p.full_name as author_name
      FROM faqs f
      LEFT JOIN companies c ON f.company_id = c.id
      LEFT JOIN profiles p ON f.author_id = p.id
      WHERE f.deleted_at IS NULL
        AND ${scopeCondition}
        ${statusCondition}
        ${searchCondition}
        ${categoryCondition}
      ORDER BY f.order_index ASC, f.created_at DESC;
    `);

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil data manajemen FAQ",
      data: result.rows,
      meta: {
        total: result.rows.length,
        scope: requestedScope,
        isPlatformOwner,
      },
    });
  } catch (err: any) {
    console.error("Get manage faqs error:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat data manajemen FAQ",
      errors: [err.message],
    });
  }
});

/**
 * POST /api/faqs
 * Membuat FAQ baru
 */
router.post("/", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const parseResult = createFaqSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validasi data FAQ gagal",
        errors: parseResult.error.issues.map((e: any) => e.message),
      });
    }

    const data = parseResult.data;
    const isPlatformOwner = await checkIsPlatformOwner(user.id, user.email);
    let targetCompanyId: string | null = null;

    if (data.scope === "global" || data.scope === "platform_admin") {
      if (!isPlatformOwner) {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak: Hanya Platform Owner yang dapat membuat FAQ Global atau Platform Admin.",
        });
      }
      targetCompanyId = null;
    } else if (data.scope === "company") {
      const tenant = await resolveTenant(req, user.id);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: "Perusahaan tidak ditemukan.",
        });
      }
      if (!tenant.isManagement && !isPlatformOwner) {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak: Hanya Owner, Admin, atau Manager perusahaan yang dapat membuat FAQ perusahaan.",
        });
      }
      targetCompanyId = tenant.companyId;
    }

    const sopUrl = data.sop_url && data.sop_url.trim().length > 0 ? data.sop_url.trim() : null;
    const sopTitle = data.sop_title && data.sop_title.trim().length > 0 ? data.sop_title.trim() : null;

    const inserted = await db
      .insert(faqs)
      .values({
        company_id: targetCompanyId,
        author_id: user.id,
        scope: data.scope,
        category: data.category.trim(),
        question: data.question.trim(),
        answer: data.answer.trim(),
        sop_title: sopTitle,
        sop_url: sopUrl,
        is_published: data.is_published,
        order_index: data.order_index,
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "FAQ berhasil ditambahkan",
      data: inserted[0],
    });
  } catch (err: any) {
    console.error("Create FAQ error:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal membuat FAQ",
      errors: [err.message],
    });
  }
});

/**
 * PUT /api/faqs/:id
 * Memperbarui FAQ yang ada
 */
router.put("/:id", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const id = req.params.id as string;

    const parseResult = updateFaqSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validasi pembaruan FAQ gagal",
        errors: parseResult.error.issues.map((e: any) => e.message),
      });
    }

    // Ambil FAQ lama untuk memeriksa kepemilikan
    const existingResult = await db
      .select()
      .from(faqs)
      .where(and(eq(faqs.id, id), isNull(faqs.deleted_at)))
      .limit(1);

    if (existingResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "FAQ tidak ditemukan",
      });
    }

    const existing = existingResult[0];
    const isPlatformOwner = await checkIsPlatformOwner(user.id, user.email);

    // Otorisasi perubahan
    if (existing.scope === "global" || existing.scope === "platform_admin") {
      if (!isPlatformOwner) {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak: Hanya Platform Owner yang berwenang mengubah FAQ Global atau Platform Admin.",
        });
      }
    } else if (existing.scope === "company") {
      const tenant = await resolveTenant(req, user.id);
      if (!tenant) {
        return res.status(403).json({ success: false, message: "Akses ditolak: Konteks perusahaan tidak ditemukan." });
      }
      if (tenant.companyId !== existing.company_id) {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak: Anda tidak memiliki izin untuk mengubah FAQ perusahaan lain.",
        });
      }
      if (!tenant.isManagement && !isPlatformOwner) {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak: Hanya Manajemen perusahaan yang dapat memperbarui FAQ ini.",
        });
      }
    }

    const data = parseResult.data;
    const updateValues: any = {
      updated_at: sql`now()`,
    };

    if (data.question !== undefined) updateValues.question = data.question.trim();
    if (data.answer !== undefined) updateValues.answer = data.answer.trim();
    if (data.category !== undefined) updateValues.category = data.category.trim();
    if (data.is_published !== undefined) updateValues.is_published = data.is_published;
    if (data.order_index !== undefined) updateValues.order_index = data.order_index;
    if (data.sop_title !== undefined) updateValues.sop_title = data.sop_title ? data.sop_title.trim() : null;
    if (data.sop_url !== undefined) updateValues.sop_url = data.sop_url ? data.sop_url.trim() : null;

    // Platform Owner dapat mengubah scope jika diperlukan
    if (data.scope !== undefined && isPlatformOwner) {
      updateValues.scope = data.scope;
      if (data.scope === "global" || data.scope === "platform_admin") {
        updateValues.company_id = null;
      }
    }

    const updated = await db
      .update(faqs)
      .set(updateValues)
      .where(eq(faqs.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "FAQ berhasil diperbarui",
      data: updated[0],
    });
  } catch (err: any) {
    console.error("Update FAQ error:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui FAQ",
      errors: [err.message],
    });
  }
});

/**
 * DELETE /api/faqs/:id
 * Menghapus FAQ secara aman (Soft Delete)
 */
router.delete("/:id", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const id = req.params.id as string;

    const existingResult = await db
      .select()
      .from(faqs)
      .where(and(eq(faqs.id, id), isNull(faqs.deleted_at)))
      .limit(1);

    if (existingResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "FAQ tidak ditemukan atau sudah dihapus",
      });
    }

    const existing = existingResult[0];
    const isPlatformOwner = await checkIsPlatformOwner(user.id, user.email);

    if (existing.scope === "global" || existing.scope === "platform_admin") {
      if (!isPlatformOwner) {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak: Hanya Platform Owner yang dapat menghapus FAQ Global atau Platform Admin.",
        });
      }
    } else if (existing.scope === "company") {
      const tenant = await resolveTenant(req, user.id);
      if (!tenant) {
        return res.status(403).json({ success: false, message: "Akses ditolak: Konteks perusahaan tidak ditemukan." });
      }
      if (tenant.companyId !== existing.company_id) {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak: Anda tidak dapat menghapus FAQ perusahaan lain.",
        });
      }
      if (!tenant.isManagement && !isPlatformOwner) {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak: Hanya Manajemen perusahaan yang dapat menghapus FAQ ini.",
        });
      }
    }

    await db
      .update(faqs)
      .set({ deleted_at: sql`now()` })
      .where(eq(faqs.id, id));

    return res.status(200).json({
      success: true,
      message: "FAQ berhasil dihapus",
      data: { id, deleted_at: new Date().toISOString() },
    });
  } catch (err: any) {
    console.error("Delete FAQ error:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus FAQ",
      errors: [err.message],
    });
  }
});

export default router;
