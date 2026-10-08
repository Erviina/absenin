import { Router, Request, Response } from "express";
import { db } from "../db";
import { news, newsCategories, notifications } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { z } from "zod";
import crypto from "crypto";

const router = Router();

const newsSchema = z.object({
  title: z.string().min(1, "Judul tidak boleh kosong"),
  content: z.string().min(1, "Konten tidak boleh kosong"),
  cover_image_url: z.string().url().optional().or(z.literal('')).or(z.null()),
  news_category_id: z.string().uuid().optional().nullable(),
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

    const profileRes = await db.execute(sql`SELECT company_id FROM profiles WHERE id = ${user.id} AND deleted_at IS NULL`);
    
    if (profileRes.rows.length === 0 || !profileRes.rows[0].company_id) {
      return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
    }
    
    const companyId = profileRes.rows[0].company_id;

    const newsRes = await db.execute(sql`
      SELECT 
        n.id, 
        n.title, 
        n.content, 
        n.cover_image_url, 
        n.created_at, 
        c.id as category_id, 
        c.name as category_name
      FROM news n
      LEFT JOIN news_categories c ON n.news_category_id = c.id
      WHERE n.company_id = ${companyId} 
        AND n.deleted_at IS NULL
      ORDER BY n.created_at DESC 
      LIMIT 5
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
      created_at: row.created_at
    }));

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil daftar berita",
      data: formattedNews
    });

  } catch (error: any) {
    console.error("Get news error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", errors: [error.message] });
  }
});

// POST /api/news
router.post("/", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    
    // Check if user is Admin or Manager
    const profileRes = await db.execute(sql`
      SELECT p.company_id, pr.role 
      FROM profiles p
      LEFT JOIN profile_roles pr ON pr.profile_id = p.id
      WHERE p.id = ${user.id} AND (pr.role = 'Admin' OR pr.role = 'Manager')
    `);
    
    if (profileRes.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }
    
    const companyId = profileRes.rows[0].company_id;
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
      updated_by: user.id,
    }).returning();
    
    const allProfilesRes = await db.execute(sql`
      SELECT id FROM profiles 
      WHERE company_id = ${companyId} AND deleted_at IS NULL
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
    
    // Check if user is Admin or Manager
    const profileRes = await db.execute(sql`
      SELECT p.company_id, pr.role 
      FROM profiles p
      LEFT JOIN profile_roles pr ON pr.profile_id = p.id
      WHERE p.id = ${user.id} AND (pr.role = 'Admin' OR pr.role = 'Manager')
    `);
    
    if (profileRes.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }
    
    const companyId = profileRes.rows[0].company_id;
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
      .where(sql`id = ${newsId} AND company_id = ${companyId}`)
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
    
    // Check if user is Admin or Manager
    const profileRes = await db.execute(sql`
      SELECT p.company_id, pr.role 
      FROM profiles p
      LEFT JOIN profile_roles pr ON pr.profile_id = p.id
      WHERE p.id = ${user.id} AND (pr.role = 'Admin' OR pr.role = 'Manager')
    `);
    
    if (profileRes.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }
    
    const companyId = profileRes.rows[0].company_id;
    
    const deletedNews = await db.update(news)
      .set({
        deleted_at: new Date(),
        deleted_by: user.id
      })
      .where(sql`id = ${newsId} AND company_id = ${companyId}`)
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
