"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
const tenant_1 = require("../utils/tenant");
const pagination_1 = require("../utils/pagination");
const router = (0, express_1.Router)();
const newsSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Judul tidak boleh kosong"),
    content: zod_1.z.string().min(1, "Konten tidak boleh kosong"),
    cover_image_url: zod_1.z.string().min(1, "Sampul berita wajib diisi"),
    news_category_id: zod_1.z.string().min(1, "Kategori berita wajib dipilih"),
});
// GET /api/news/categories
router.get("/categories", auth_1.authenticate, async (req, res) => {
    try {
        const categories = await db_1.db.select().from(schema_1.newsCategories).where((0, drizzle_orm_1.sql) `deleted_at IS NULL`);
        return res.status(200).json({ success: true, data: categories });
    }
    catch (error) {
        console.error("Get news categories error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        if (!tenant) {
            return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
        }
        const companyId = tenant.companyId;
        const { limit, offset } = (0, pagination_1.parsePaginationParams)(req.query, 10, 100);
        const { search, category, category_id, date } = req.query;
        let searchCondition = (0, drizzle_orm_1.sql) ``;
        if (search && typeof search === "string" && search.trim()) {
            const q = `%${search.trim()}%`;
            searchCondition = (0, drizzle_orm_1.sql) `AND (n.title ILIKE ${q} OR n.content ILIKE ${q})`;
        }
        let categoryCondition = (0, drizzle_orm_1.sql) ``;
        if (category_id && typeof category_id === "string") {
            categoryCondition = (0, drizzle_orm_1.sql) `AND n.news_category_id = ${category_id}`;
        }
        else if (category && typeof category === "string" && category !== "Semua") {
            categoryCondition = (0, drizzle_orm_1.sql) `AND (c.name ILIKE ${category} OR c.name ILIKE ${'%' + category + '%'})`;
        }
        let dateCondition = (0, drizzle_orm_1.sql) ``;
        if (date && typeof date === "string" && date.trim()) {
            dateCondition = (0, drizzle_orm_1.sql) `AND (DATE(n.created_at AT TIME ZONE 'Asia/Jakarta') = ${date.trim()}::date)`;
        }
        // 1. Get total count
        const countRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT COUNT(*) as total
      FROM news n
      LEFT JOIN news_categories c ON n.news_category_id = c.id
      WHERE n.company_id = ${companyId} 
        AND n.deleted_at IS NULL
        ${searchCondition}
        ${categoryCondition}
        ${dateCondition}
    `);
        const total = parseInt(countRes.rows[0]?.total, 10) || 0;
        // 2. Fetch paginated news
        const newsRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
        const formattedNews = newsRes.rows.map((row) => ({
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
        const paginationMeta = (0, pagination_1.buildPaginationMeta)(total, limit, offset);
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
    }
    catch (error) {
        console.error("Get news error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", errors: [error.message] });
    }
});
// GET /api/news/:id
router.get("/:id", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const newsId = req.params.id;
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        if (!tenant) {
            return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
        }
        const companyId = tenant.companyId;
        const newsRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
        const row = newsRes.rows[0];
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
    }
    catch (error) {
        console.error("Get news detail error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", errors: [error.message] });
    }
});
// POST /api/news
router.post("/", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        if (!tenant) {
            return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
        }
        if (!tenant.isManagement) {
            return res.status(403).json({ success: false, message: "Akses ditolak: Hanya Owner, Admin, atau Manager yang dapat menerbitkan berita" });
        }
        const companyId = tenant.companyId;
        const validatedData = newsSchema.parse(req.body);
        const newNews = await db_1.db.insert(schema_1.news).values({
            id: crypto_1.default.randomUUID(),
            company_id: companyId,
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
        const allProfilesRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT profile_id as id FROM company_members 
      WHERE company_id = ${companyId} AND status = 'active' AND deleted_at IS NULL AND profile_id != ${user.id}
    `);
        if (allProfilesRes.rows.length > 0) {
            const rawContent = validatedData.content || "";
            const shortMessage = rawContent.length > 100 ? rawContent.substring(0, 97) + "..." : rawContent;
            const notifData = allProfilesRes.rows.map((row) => ({
                company_id: companyId,
                recipient_id: row.id,
                type: "NEW_ANNOUNCEMENT",
                title: validatedData.title,
                message: shortMessage,
                reference_id: newNews[0].id,
            }));
            await db_1.db.insert(schema_1.notifications).values(notifData);
        }
        return res.status(201).json({ success: true, message: "Berita berhasil dibuat", data: newNews[0] });
    }
    catch (error) {
        console.error("Create news error:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, message: "Data tidak valid", errors: error.issues });
        }
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});
// PUT /api/news/:id
router.put("/:id", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const newsId = req.params.id;
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        if (!tenant) {
            return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
        }
        if (!tenant.isManagement) {
            return res.status(403).json({ success: false, message: "Akses ditolak" });
        }
        const companyId = tenant.companyId;
        const validatedData = newsSchema.parse(req.body);
        const updatedNews = await db_1.db.update(schema_1.news)
            .set({
            title: validatedData.title,
            content: validatedData.content,
            cover_image_url: validatedData.cover_image_url || null,
            news_category_id: validatedData.news_category_id || null,
            updated_by: user.id,
            updated_at: new Date()
        })
            .where((0, drizzle_orm_1.sql) `id = ${newsId} AND company_id = ${companyId} AND deleted_at IS NULL`)
            .returning();
        if (updatedNews.length === 0) {
            return res.status(404).json({ success: false, message: "Berita tidak ditemukan" });
        }
        return res.status(200).json({ success: true, message: "Berita berhasil diubah", data: updatedNews[0] });
    }
    catch (error) {
        console.error("Update news error:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, message: "Data tidak valid", errors: error.issues });
        }
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});
// DELETE /api/news/:id
router.delete("/:id", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const newsId = req.params.id;
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        if (!tenant) {
            return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
        }
        if (!tenant.isManagement) {
            return res.status(403).json({ success: false, message: "Akses ditolak" });
        }
        const companyId = tenant.companyId;
        const deletedNews = await db_1.db.update(schema_1.news)
            .set({
            deleted_at: new Date(),
            deleted_by: user.id
        })
            .where((0, drizzle_orm_1.sql) `id = ${newsId} AND company_id = ${companyId} AND deleted_at IS NULL`)
            .returning();
        if (deletedNews.length === 0) {
            return res.status(404).json({ success: false, message: "Berita tidak ditemukan" });
        }
        return res.status(200).json({ success: true, message: "Berita berhasil dihapus" });
    }
    catch (error) {
        console.error("Delete news error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});
exports.default = router;
