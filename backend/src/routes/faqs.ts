import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { faqs, profiles, companies } from "../db/schema";
import { eq, and, sql, desc, asc, isNull } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { resolveTenant } from "../utils/tenant";
import { isPlatformOwnerEmail } from "../middleware/platformAuth";
import jwt from "jsonwebtoken";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";

const router = Router();

/**
 * Sanitasi HTML aman untuk jawaban FAQ pada sisi server.
 * Mempertahankan tag formatting TipTap dan mencegah script/XSS.
 */
export function sanitizeFaqAnswer(raw: string): string {
  if (!raw) return "";

  // Jika input berupa teks biasa murni (tanpa tag HTML), pertahankan apa adanya
  if (!/<[a-z][\s\S]*>/i.test(raw)) {
    return raw.trim();
  }

  return sanitizeHtml(raw, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "a",
      "blockquote",
      "code",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel", "title"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: (tagName, attribs) => {
        return {
          tagName: "a",
          attribs: {
            ...attribs,
            target: "_blank",
            rel: "noopener noreferrer",
          },
        };
      },
    },
  }).trim();
}

// Zod Enums untuk Metadata Pusat Bantuan
export const contentScopeEnum = z.enum(["platform", "company", "user"]);
export const targetRoleEnum = z.enum(["platform_admin", "company_owner_admin", "manager", "employee"]);
export const contentTypeEnum = z.enum(["sop_guide", "faq", "troubleshooting", "tips_best_practice"]);
export const displayContextEnum = z.enum(["login", "help_center", "both"]);

// Kategori Standar Sistem
export const STANDARD_CATEGORIES = [
  "Akun",
  "Perusahaan",
  "Absensi",
  "Persetujuan",
  "Tugas",
  "Laporan",
  "Analitik",
  "Sistem",
  "Pengaturan",
];

// Kategori Legacy untuk backward-compatibility dengan data yang ada
export const LEGACY_CATEGORIES = [
  "Umum",
  "Presensi",
  "GPS & Lokasi",
  "Izin & Cuti",
  "Kebijakan Kantor",
  "SOP Kerja",
  "Platform Admin",
];

// Zod Schema untuk Validasi Input FAQ
export const createFaqSchema = z.object({
  question: z.string().min(3, "Pertanyaan minimal 3 karakter"),
  answer: z.string().min(5, "Jawaban minimal 5 karakter"),
  category: z.string().min(1, "Kategori wajib diisi").max(100, "Kategori maksimal 100 karakter").default("Umum"),
  scope: z.enum(["global", "company", "platform_admin"]).default("company"),
  content_scope: contentScopeEnum.optional(),
  target_roles: z.array(targetRoleEnum).optional().default([]),
  content_type: contentTypeEnum.optional().default("faq"),
  display_context: displayContextEnum.optional().default("help_center"),
  needs_review: z.boolean().optional().default(false),
  sop_title: z.string().max(255).optional().nullable(),
  sop_url: z.string().url("URL SOP harus berupa tautan yang valid (http/https)").optional().nullable().or(z.literal("")),
  is_published: z.boolean().default(true),
  order_index: z.number().int().default(0),
});

export const updateFaqSchema = createFaqSchema.partial();

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
 * Menggabungkan kategori standar, legacy, dan kategori kustom yang ada di database
 */
router.get("/categories", optionalAuthenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const { content_scope, display_context, only_existing } = req.query;

    const user = (req as any).user;
    let companyId: string | null = null;
    let isPlatformOwner = false;

    if (user?.id) {
      isPlatformOwner = await checkIsPlatformOwner(user.id, user.email);
      const tenant = await resolveTenant(req, user.id);
      if (tenant?.companyId) {
        companyId = tenant.companyId;
      }
    }

    let filterCondition = sql`deleted_at IS NULL AND is_published = true`;

    if (!user?.id) {
      // Pengunjung belum login: batasi kategori hanya dari konten global/publik login
      filterCondition = sql`${filterCondition} AND scope = 'global' AND company_id IS NULL AND content_scope != 'platform' AND display_context IN ('login', 'both')`;
    } else {
      // Terapkan isolasi tenant dan wewenang platform
      if (companyId && isPlatformOwner) {
        filterCondition = sql`${filterCondition} AND (scope = 'global' OR (scope = 'company' AND company_id = ${companyId}) OR scope = 'platform_admin')`;
      } else if (companyId) {
        filterCondition = sql`${filterCondition} AND (scope = 'global' OR (scope = 'company' AND company_id = ${companyId}))`;
      } else if (isPlatformOwner) {
        filterCondition = sql`${filterCondition} AND (scope = 'global' OR scope = 'platform_admin')`;
      } else {
        filterCondition = sql`${filterCondition} AND scope = 'global' AND company_id IS NULL`;
      }

      if (content_scope && typeof content_scope === "string") {
        filterCondition = sql`${filterCondition} AND content_scope = ${content_scope.trim()}`;
      }
      if (display_context && typeof display_context === "string") {
        const dc = display_context.trim();
        if (dc === "login") {
          filterCondition = sql`${filterCondition} AND display_context IN ('login', 'both')`;
        } else if (dc === "help_center") {
          filterCondition = sql`${filterCondition} AND display_context IN ('help_center', 'both')`;
        } else {
          filterCondition = sql`${filterCondition} AND display_context = ${dc}`;
        }
      }
    }

    const categoriesRes = await db.execute(sql`
      SELECT DISTINCT category 
      FROM faqs 
      WHERE ${filterCondition}
      ORDER BY category ASC;
    `);

    const dbCategories = categoriesRes.rows.map((r: any) => r.category).filter(Boolean);

    // Jika dipanggil dengan only_existing=true (misalnya untuk filter Pusat Bantuan publik),
    // kembalikan hanya kategori yang benar-benar memiliki konten relevan
    if (only_existing === "true") {
      return res.status(200).json({
        success: true,
        data: dbCategories,
      });
    }

    const combined = Array.from(new Set([...STANDARD_CATEGORIES, ...LEGACY_CATEGORIES, ...dbCategories]));

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
 * Mengambil daftar FAQ yang dipublikasikan untuk pengguna aplikasi (Profil -> Pusat Bantuan, Login, dll.)
 * Sesuai hak akses:
 * - FAQ Global: Tampil untuk semua pengguna.
 * - FAQ Perusahaan: Tampil hanya untuk anggota perusahaan aktif pengguna.
 * - FAQ Platform Admin: Tampil HANYA untuk Platform Owner (isDeveloper === true).
 * 
 * Filter yang didukung:
 * - search, category, scope
 * - content_scope ('platform', 'company', 'user')
 * - target_role ('platform_admin', 'company_owner_admin', 'manager', 'employee')
 * - content_type ('sop_guide', 'faq', 'troubleshooting', 'tips_best_practice')
 * - display_context ('login', 'help_center', 'both')
 * - needs_review ('true', 'false')
 */
router.get("/", optionalAuthenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const { 
      search, 
      category, 
      scope, 
      content_scope, 
      target_role, 
      role, 
      content_type, 
      display_context, 
      needs_review 
    } = req.query;

    let companyId: string | null = null;
    let isPlatformOwner = false;

    if (user?.id) {
      isPlatformOwner = await checkIsPlatformOwner(user.id, user.email);
      const tenant = await resolveTenant(req, user.id);
      if (tenant?.companyId) {
        companyId = tenant.companyId;
      }
    }

    const isLoginRequest = display_context === "login";

    // Bangun filter akses scope otoritatif berdasarkan identitas pengguna dan konteks
    let scopeAccessCondition = sql`f.scope = 'global' AND f.company_id IS NULL AND f.content_scope != 'platform'`;

    if (isLoginRequest || !user?.id) {
      // Konteks pra-login atau pengguna tamu: HANYA konten publik/global non-platform
      scopeAccessCondition = sql`f.scope = 'global' AND f.company_id IS NULL AND f.content_scope != 'platform'`;
    } else {
      // Pengguna terautentikasi di Help Center
      if (companyId && isPlatformOwner) {
        scopeAccessCondition = sql`(f.scope = 'global' OR (f.scope = 'company' AND f.company_id = ${companyId}) OR f.scope = 'platform_admin')`;
      } else if (companyId) {
        scopeAccessCondition = sql`(f.scope = 'global' OR (f.scope = 'company' AND f.company_id = ${companyId}))`;
      } else if (isPlatformOwner) {
        scopeAccessCondition = sql`(f.scope = 'global' OR f.scope = 'platform_admin')`;
      } else {
        scopeAccessCondition = sql`f.scope = 'global' AND f.company_id IS NULL`;
      }
    }

    // Filter eksplisit scope lama
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
      if (isLoginRequest && (scope === "company" || scope === "platform_admin")) {
        return res.status(200).json({ success: true, data: [] });
      }
      explicitScopeCondition = sql`AND f.scope = ${scope}`;
    }

    // Filter eksplisit content_scope baru
    let contentScopeCondition = sql``;
    if (content_scope && typeof content_scope === "string") {
      const cleanContentScope = content_scope.trim();
      if (cleanContentScope === "platform" && !isPlatformOwner) {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak: Konten tingkat platform hanya dapat diakses oleh Platform Owner.",
        });
      }
      if (cleanContentScope === "company" && !companyId) {
        return res.status(200).json({ success: true, data: [] });
      }
      if (isLoginRequest && (cleanContentScope === "company" || cleanContentScope === "platform")) {
        return res.status(200).json({ success: true, data: [] });
      }
      contentScopeCondition = sql`AND f.content_scope = ${cleanContentScope}`;
    }

    // Filter target_role (mendukung target_role atau role alias)
    let targetRoleCondition = sql``;
    const requestedRole = (target_role || role) as string | undefined;
    if (requestedRole && typeof requestedRole === "string" && requestedRole.trim()) {
      const cleanRole = requestedRole.trim();
      targetRoleCondition = sql`AND (${cleanRole} = ANY(f.target_roles) OR cardinality(f.target_roles) = 0)`;
    }

    // Filter content_type
    let contentTypeCondition = sql``;
    if (content_type && typeof content_type === "string" && content_type.trim()) {
      contentTypeCondition = sql`AND f.content_type = ${content_type.trim()}`;
    }

    // Filter display_context
    let displayContextCondition = sql``;
    if (!user?.id) {
      // Pengguna tamu (belum login): HANYA boleh mengakses konten login atau both
      if (display_context && display_context === "help_center") {
        return res.status(200).json({ success: true, data: [] });
      }
      displayContextCondition = sql`AND f.display_context IN ('login', 'both')`;
    } else if (isLoginRequest) {
      displayContextCondition = sql`AND f.display_context IN ('login', 'both')`;
    } else if (display_context && typeof display_context === "string" && display_context.trim()) {
      const dc = display_context.trim();
      if (dc === "login") {
        displayContextCondition = sql`AND f.display_context IN ('login', 'both')`;
      } else if (dc === "help_center") {
        displayContextCondition = sql`AND f.display_context IN ('help_center', 'both')`;
      } else if (dc === "both") {
        displayContextCondition = sql`AND f.display_context = 'both'`;
      } else if (dc === "all") {
        displayContextCondition = sql``;
      } else {
        displayContextCondition = sql`AND f.display_context = ${dc}`;
      }
    } else {
      // Default untuk Help Center setelah login: tampilkan konten help_center dan both
      displayContextCondition = sql`AND f.display_context IN ('help_center', 'both')`;
    }

    // Filter needs_review
    let needsReviewCondition = sql``;
    if (needs_review !== undefined && needs_review !== "") {
      const isReview = String(needs_review).toLowerCase() === "true";
      needsReviewCondition = sql`AND f.needs_review = ${isReview}`;
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
        f.content_scope,
        f.target_roles,
        f.content_type,
        f.display_context,
        f.needs_review,
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
        ${contentScopeCondition}
        ${targetRoleCondition}
        ${contentTypeCondition}
        ${displayContextCondition}
        ${needsReviewCondition}
        ${searchCondition}
        ${categoryCondition}
      ORDER BY LOWER(f.question) ASC, f.created_at DESC;
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
    const { 
      scope, 
      content_scope,
      status, 
      search, 
      category, 
      target_role, 
      role, 
      content_type, 
      display_context, 
      needs_review 
    } = req.query;

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

    // Filter kondisi scope otoritatif
    let scopeCondition = sql``;
    if (requestedScope === "global") {
      scopeCondition = sql`f.scope = 'global'`;
    } else if (requestedScope === "platform_admin") {
      scopeCondition = sql`f.scope = 'platform_admin'`;
    } else {
      // Isolasi ketat: hanya ambil data perusahaan aktif
      scopeCondition = sql`f.scope = 'company' AND f.company_id = ${tenant!.companyId}`;
    }

    // Filter tambahan content_scope
    let contentScopeCondition = sql``;
    if (content_scope && typeof content_scope === "string") {
      const cleanContentScope = content_scope.trim();
      if (cleanContentScope === "platform" && !isPlatformOwner) {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak: Hanya Platform Owner yang dapat mengakses data scope platform.",
        });
      }
      contentScopeCondition = sql`AND f.content_scope = ${cleanContentScope}`;
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

    // Filter target_role
    let targetRoleCondition = sql``;
    const requestedRole = (target_role || role) as string | undefined;
    if (requestedRole && typeof requestedRole === "string" && requestedRole.trim()) {
      const cleanRole = requestedRole.trim();
      targetRoleCondition = sql`AND (${cleanRole} = ANY(f.target_roles) OR cardinality(f.target_roles) = 0)`;
    }

    // Filter content_type
    let contentTypeCondition = sql``;
    if (content_type && typeof content_type === "string" && content_type.trim()) {
      contentTypeCondition = sql`AND f.content_type = ${content_type.trim()}`;
    }

    // Filter display_context
    let displayContextCondition = sql``;
    if (display_context && typeof display_context === "string" && display_context.trim()) {
      const dc = display_context.trim();
      if (dc === "login") {
        displayContextCondition = sql`AND f.display_context IN ('login', 'both')`;
      } else if (dc === "help_center") {
        displayContextCondition = sql`AND f.display_context IN ('help_center', 'both')`;
      } else if (dc === "both") {
        displayContextCondition = sql`AND f.display_context = 'both'`;
      } else {
        displayContextCondition = sql`AND f.display_context = ${dc}`;
      }
    }

    // Filter needs_review
    let needsReviewCondition = sql``;
    if (needs_review !== undefined && needs_review !== "") {
      const isReview = String(needs_review).toLowerCase() === "true";
      needsReviewCondition = sql`AND f.needs_review = ${isReview}`;
    }

    const result = await db.execute(sql`
      SELECT 
        f.id,
        f.company_id,
        f.author_id,
        f.scope,
        f.content_scope,
        f.target_roles,
        f.content_type,
        f.display_context,
        f.needs_review,
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
        ${contentScopeCondition}
        ${statusCondition}
        ${searchCondition}
        ${categoryCondition}
        ${targetRoleCondition}
        ${contentTypeCondition}
        ${displayContextCondition}
        ${needsReviewCondition}
      ORDER BY LOWER(f.question) ASC, f.created_at DESC;
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
 * GET /api/faqs/:id
 * Mengambil detail satu FAQ berdasarkan ID
 */
router.get("/:id", optionalAuthenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const id = req.params.id as string;

    const result = await db.execute(sql`
      SELECT 
        f.id,
        f.company_id,
        f.author_id,
        f.scope,
        f.content_scope,
        f.target_roles,
        f.content_type,
        f.display_context,
        f.needs_review,
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
      WHERE f.id = ${id} AND f.deleted_at IS NULL
      LIMIT 1;
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "FAQ tidak ditemukan",
      });
    }

    const item: any = result.rows[0];

    // Cek otorisasi jika scope bukan global
    if (item.scope === "platform_admin" || item.content_scope === "platform") {
      let isPlatformOwner = false;
      if (user?.id) {
        isPlatformOwner = await checkIsPlatformOwner(user.id, user.email);
      }
      if (!isPlatformOwner) {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak: Konten ini memerlukan hak akses Platform Owner.",
        });
      }
    } else if (item.scope === "company") {
      if (!user?.id) {
        return res.status(401).json({ success: false, message: "Autentikasi diperlukan." });
      }
      const tenant = await resolveTenant(req, user.id);
      const isPlatformOwner = await checkIsPlatformOwner(user.id, user.email);
      if (!isPlatformOwner && tenant?.companyId !== item.company_id) {
        return res.status(403).json({ success: false, message: "Akses ditolak: Konten perusahaan lain." });
      }
    }

    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (err: any) {
    console.error("Get FAQ detail error:", err);
    return res.status(500).json({ success: false, message: "Gagal mengambil detail FAQ", errors: [err.message] });
  }
});

/**
 * POST /api/faqs
 * Membuat FAQ baru dengan dukungan metadata lengkap
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

    // Harmonisasikan scope lama dan content_scope baru
    let finalScope = data.scope;
    let finalContentScope = data.content_scope;

    if (finalContentScope && !req.body.scope) {
      if (finalContentScope === "platform") finalScope = "platform_admin";
      else if (finalContentScope === "company") finalScope = "company";
      else if (finalContentScope === "user") finalScope = "global";
    } else if (finalScope && !finalContentScope) {
      if (finalScope === "platform_admin") finalContentScope = "platform";
      else if (finalScope === "company") finalContentScope = "company";
      else if (finalScope === "global") finalContentScope = "company";
    }
    finalContentScope = finalContentScope || "company";
    finalScope = finalScope || "company";

    // Otorisasi role dan isolasi tenant
    if (finalScope === "global" || finalScope === "platform_admin" || finalContentScope === "platform") {
      if (!isPlatformOwner) {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak: Hanya Platform Owner yang dapat membuat FAQ Global atau Platform Admin.",
        });
      }
      targetCompanyId = null;
    } else if (finalScope === "company" || finalContentScope === "company" || finalContentScope === "user") {
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
        scope: finalScope,
        category: data.category.trim(),
        question: data.question.trim(),
        answer: sanitizeFaqAnswer(data.answer),
        sop_title: sopTitle,
        sop_url: sopUrl,
        is_published: data.is_published,
        order_index: data.order_index,
        content_scope: finalContentScope,
        target_roles: data.target_roles || [],
        content_type: data.content_type || "faq",
        display_context: data.display_context || "help_center",
        needs_review: data.needs_review ?? false,
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
 * Memperbarui FAQ yang ada beserta metadata baru
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

    // Ambil FAQ lama untuk memeriksa kepemilikan dan integritas tenant
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
    if (existing.scope === "global" || existing.scope === "platform_admin" || existing.content_scope === "platform") {
      if (!isPlatformOwner) {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak: Hanya Platform Owner yang berwenang mengubah FAQ Global atau Platform Admin.",
        });
      }
    } else if (existing.scope === "company" || existing.content_scope === "company") {
      const tenant = await resolveTenant(req, user.id);
      if (!tenant) {
        return res.status(403).json({ success: false, message: "Akses ditolak: Konteks perusahaan tidak ditemukan." });
      }
      if (tenant.companyId !== existing.company_id && !isPlatformOwner) {
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
    if (data.answer !== undefined) updateValues.answer = sanitizeFaqAnswer(data.answer);
    if (data.category !== undefined) updateValues.category = data.category.trim();
    if (data.is_published !== undefined) updateValues.is_published = data.is_published;
    if (data.order_index !== undefined) updateValues.order_index = data.order_index;
    if (data.sop_title !== undefined) updateValues.sop_title = data.sop_title ? data.sop_title.trim() : null;
    if (data.sop_url !== undefined) updateValues.sop_url = data.sop_url ? data.sop_url.trim() : null;

    // Metadata baru
    if (data.content_scope !== undefined) updateValues.content_scope = data.content_scope;
    if (data.target_roles !== undefined) updateValues.target_roles = data.target_roles;
    if (data.content_type !== undefined) updateValues.content_type = data.content_type;
    if (data.display_context !== undefined) updateValues.display_context = data.display_context;
    if (data.needs_review !== undefined) updateValues.needs_review = data.needs_review;

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

    if (existing.scope === "global" || existing.scope === "platform_admin" || existing.content_scope === "platform") {
      if (!isPlatformOwner) {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak: Hanya Platform Owner yang dapat menghapus FAQ Global atau Platform Admin.",
        });
      }
    } else if (existing.scope === "company" || existing.content_scope === "company") {
      const tenant = await resolveTenant(req, user.id);
      if (!tenant) {
        return res.status(403).json({ success: false, message: "Akses ditolak: Konteks perusahaan tidak ditemukan." });
      }
      if (tenant.companyId !== existing.company_id && !isPlatformOwner) {
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
