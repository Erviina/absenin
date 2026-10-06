import { Router, Request, Response } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth";

const router = Router();

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
      JOIN news_categories c ON n.news_category_id = c.id
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

export default router;
