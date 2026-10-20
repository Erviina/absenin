import { Router, Request, Response } from "express";
import { db } from "../db";
import { news, newsCategories, notifications } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { z } from "zod";
import crypto from "crypto";
import { resolveTenant } from "../utils/tenant";
import { parsePaginationParams, buildPaginationMeta } from "../utils/pagination";

const router = Router();

const newsSchema = z.object({
  title: z.string().min(1, "Judul tidak boleh kosong"),
  content: z.string().min(1, "Konten tidak boleh kosong"),
  cover_image_url: z.string().min(1, "Sampul berita wajib diisi"),
  news_category_id: z.string().min(1, "Kategori berita wajib dipilih"),
});

// GET /api/news/categories
router.get("/categories", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const categories = await db.select().from(newsCategories).where(sql`deleted_at IS NULL`);
    return res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    console.error("Get news categories error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const tenant = await resolveTenant(req, user.id);
    
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
    }
    
    const companyId = tenant.companyId;
    const { limit, offset } = parsePaginationParams(req.query, 10, 100);

    const { search, category, category_id, date } = req.query;

    let searchCondition = sql``;
    if (search && typeof search === "string" && search.trim()) {
      const q = `%${search.trim()}%`;
      searchCondition = sql`AND (n.title ILIKE ${q} OR n.content ILIKE ${q})`;
    }

    let categoryCondition = sql``;
    if (category_id && typeof category_id === "string") {
      categoryCondition = sql`AND n.news_category_id = ${category_id}`;
    } else if (category && typeof category === "string" && category !== "Semua") {
      categoryCondition = sql`AND (c.name ILIKE ${category} OR c.name ILIKE ${'%' + category + '%'})`;
    }

    let dateCondition = sql``;
    if (date && typeof date === "string" && date.trim()) {
      dateCondition = sql`AND (DATE(n.created_at AT TIME ZONE 'Asia/Jakarta') = ${date.trim()}::date)`;
    }

    // 1. Get total count
    const countRes = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM news n
      LEFT JOIN news_categories c ON n.news_category_id = c.id
      WHERE n.company_id = ${companyId} 
        AND n.deleted_at IS NULL
        ${searchCondition}
        ${categoryCondition}
        ${dateCondition}
    `);
    const total = parseInt(countRes.rows[0]?.total as string, 10) || 0;

    // 2. Fetch paginated news
    const newsRes = await db.execute(sql`
      SELECT 
        n.id, 
        n.title, 
        n.content, 
        n.cover_image_url, 
        n.created_at, 
        c.id as category_id, 
        c.name as category_name,
        p.id as author_id,
        p.full_name as author_name,
        p.avatar_url as author_avatar_url
      FROM news n
      LEFT JOIN news_categories c ON n.news_category_id = c.id
      LEFT JOIN profiles p ON COALESCE(n.author_id, n.created_by, n.profile_id) = p.id
      WHERE n.company_id = ${companyId} 
        AND n.deleted_at IS NULL
        ${searchCondition}
        ${categoryCondition}
        ${dateCondition}
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const formattedNews = newsRes.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      cover_image_url: row.cover_image_url,
      category: {
        id: row.category_id,
        name: row.category_name
      },
      author: {
        id: row.author_id,
        name: row.author_name || "Admin",
        avatar_url: row.author_avatar_url
      },
      created_at: row.created_at
    }));

    const paginationMeta = buildPaginationMeta(total, limit, offset);

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil daftar berita",
      data: formattedNews,
      pagination: paginationMeta,
      meta: {
        total,
        limit,
        offset,
      }
    });

  } catch (error: any) {
    console.error("Get news error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", errors: [error.message] });
  }
});

// GET /api/news/:id
router.get("/:id", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const newsId = req.params.id;
    const tenant = await resolveTenant(req, user.id);
    
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
    }
    
    const companyId = tenant.companyId;

    const newsRes = await db.execute(sql`
      SELECT 
        n.id, 
        n.title, 
        n.content, 
        n.cover_image_url, 
        n.created_at, 
        c.id as category_id, 
        c.name as category_name,
        p.id as author_id,
        p.full_name as author_name,
        p.avatar_url as author_avatar_url
      FROM news n
      LEFT JOIN news_categories c ON n.news_category_id = c.id
      LEFT JOIN profiles p ON COALESCE(n.author_id, n.created_by, n.profile_id) = p.id
      WHERE n.id = ${newsId}
        AND n.company_id = ${companyId} 
        AND n.deleted_at IS NULL
      LIMIT 1
    `);

    if (newsRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Berita tidak ditemukan" });
    }

    const row: any = newsRes.rows[0];
    const formattedItem = {
      id: row.id,
      title: row.title,
      content: row.content,
      cover_image_url: row.cover_image_url,
      category: {
        id: row.category_id,
        name: row.category_name
      },
      author: {
        id: row.author_id,
        name: row.author_name || "Admin",
        avatar_url: row.author_avatar_url
      },
      created_at: row.created_at
    };

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil detail berita",
      data: formattedItem
    });

  } catch (error: any) {
    console.error("Get news detail error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", errors: [error.message] });
  }
});

// POST /api/news
router.post("/", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const tenant = await resolveTenant(req, user.id);
    
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
    }

    if (!tenant.isManagement) {
      return res.status(403).json({ success: false, message: "Akses ditolak: Hanya Owner, Admin, atau Manager yang dapat menerbitkan berita" });
    }
    
    const companyId = tenant.companyId;
    const validatedData = newsSchema.parse(req.body);
    
    const newNews = await db.insert(news).values({
      id: crypto.randomUUID(),
      company_id: companyId as string,
      author_id: user.id,
      title: validatedData.title,
      content: validatedData.content,
      cover_image_url: validatedData.cover_image_url || null,
      news_category_id: validatedData.news_category_id || null,
      created_by: user.id,
      profile_id: user.id,
      created_at: new Date(),
      updated_at: new Date()
    }).returning();

    // Broadcast notifications to all members of this company
    const allProfilesRes = await db.execute(sql`
      SELECT profile_id as id FROM company_members 
      WHERE company_id = ${companyId} AND status = 'active' AND deleted_at IS NULL AND profile_id != ${user.id}
    `);

    if (allProfilesRes.rows.length > 0) {
      const rawContent = validatedData.content || "";
      const shortMessage = rawContent.length > 100 ? rawContent.substring(0, 97) + "..." : rawContent;

      const notifData = allProfilesRes.rows.map((row: any) => ({
        company_id: companyId as string,
        recipient_id: row.id as string,
        type: "NEW_ANNOUNCEMENT",
        title: validatedData.title,
        message: shortMessage,
        reference_id: newNews[0].id as string,
      }));

      await db.insert(notifications).values(notifData);
    }

    return res.status(201).json({ success: true, message: "Berita berhasil dibuat", data: newNews[0] });
  } catch (error: any) {
    console.error("Create news error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Data tidak valid", errors: error.issues });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// PUT /api/news/:id
router.put("/:id", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const newsId = req.params.id;
    const tenant = await resolveTenant(req, user.id);
    
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
    }

    if (!tenant.isManagement) {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }
    
    const companyId = tenant.companyId;
    const validatedData = newsSchema.parse(req.body);
    
    const updatedNews = await db.update(news)
      .set({
        title: validatedData.title,
        content: validatedData.content,
        cover_image_url: validatedData.cover_image_url || null,
        news_category_id: validatedData.news_category_id || null,
        updated_by: user.id,
        updated_at: new Date()
      })
      .where(sql`id = ${newsId} AND company_id = ${companyId} AND deleted_at IS NULL`)
      .returning();
      
    if (updatedNews.length === 0) {
      return res.status(404).json({ success: false, message: "Berita tidak ditemukan" });
    }
    
    return res.status(200).json({ success: true, message: "Berita berhasil diubah", data: updatedNews[0] });
  } catch (error: any) {
    console.error("Update news error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Data tidak valid", errors: error.issues });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// DELETE /api/news/:id
router.delete("/:id", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const newsId = req.params.id;
    const tenant = await resolveTenant(req, user.id);
    
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
    }

    if (!tenant.isManagement) {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }
    
    const companyId = tenant.companyId;
    
    const deletedNews = await db.update(news)
      .set({
        deleted_at: new Date(),
        deleted_by: user.id
      })
      .where(sql`id = ${newsId} AND company_id = ${companyId} AND deleted_at IS NULL`)
      .returning();
      
    if (deletedNews.length === 0) {
      return res.status(404).json({ success: false, message: "Berita tidak ditemukan" });
    }
    
    return res.status(200).json({ success: true, message: "Berita berhasil dihapus" });
  } catch (error: any) {
    console.error("Delete news error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
