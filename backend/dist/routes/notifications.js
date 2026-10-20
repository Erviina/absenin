"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const pagination_1 = require("../utils/pagination");
const router = (0, express_1.Router)();
router.get("/unread-count", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const [result] = await db_1.db.select({
            count: (0, drizzle_orm_1.count)()
        })
            .from(schema_1.notifications)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.recipient_id, user.id), (0, drizzle_orm_1.eq)(schema_1.notifications.is_read, false)));
        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil jumlah notifikasi belum dibaca",
            data: {
                count: result.count
            },
        });
    }
    catch (error) {
        console.error("Get unread-count error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const { limit, offset } = (0, pagination_1.parsePaginationParams)(req.query, 10, 100);
        const { search, category, type, start_date, end_date } = req.query;
        let searchCond = (0, drizzle_orm_1.sql) ``;
        if (search && typeof search === "string" && search.trim()) {
            const q = `%${search.trim()}%`;
            searchCond = (0, drizzle_orm_1.sql) `AND (title ILIKE ${q} OR message ILIKE ${q})`;
        }
        let categoryCond = (0, drizzle_orm_1.sql) ``;
        if (category && typeof category === "string" && category !== "Semua") {
            if (category === "Absensi") {
                categoryCond = (0, drizzle_orm_1.sql) `AND type IN ('ATTENDANCE_REMINDER', 'AGENDA_UPCOMING')`;
            }
            else if (category === "Izin & Cuti") {
                categoryCond = (0, drizzle_orm_1.sql) `AND type IN ('LEAVE_PENDING', 'LEAVE_APPROVED', 'LEAVE_REJECTED')`;
            }
            else if (category === "Sistem") {
                categoryCond = (0, drizzle_orm_1.sql) `AND type IN ('JOIN_REQUEST_PENDING', 'JOIN_REQUEST_APPROVED', 'JOIN_REQUEST_REJECTED', 'NEW_ANNOUNCEMENT', 'ROLE_CHANGED', 'member_removed')`;
            }
        }
        else if (type && typeof type === "string") {
            categoryCond = (0, drizzle_orm_1.sql) `AND type = ${type}`;
        }
        let dateCond = (0, drizzle_orm_1.sql) ``;
        if (start_date && typeof start_date === "string") {
            dateCond = (0, drizzle_orm_1.sql) `${dateCond} AND (DATE(created_at AT TIME ZONE 'Asia/Jakarta') >= ${start_date}::date)`;
        }
        if (end_date && typeof end_date === "string") {
            dateCond = (0, drizzle_orm_1.sql) `${dateCond} AND (DATE(created_at AT TIME ZONE 'Asia/Jakarta') <= ${end_date}::date)`;
        }
        // 1. Total count
        const countRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT COUNT(*) as total
      FROM notifications
      WHERE recipient_id = ${user.id}
        ${searchCond}
        ${categoryCond}
        ${dateCond}
    `);
        const total = parseInt(countRes.rows[0]?.total, 10) || 0;
        // 2. Fetch paginated records
        const resultsRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT 
        id,
        company_id,
        type,
        title,
        message,
        reference_id,
        is_read,
        created_at
      FROM notifications
      WHERE recipient_id = ${user.id}
        ${searchCond}
        ${categoryCond}
        ${dateCond}
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);
        const results = resultsRes.rows.map((row) => ({
            id: row.id,
            company_id: row.company_id,
            type: row.type,
            title: row.title,
            message: row.message,
            reference_id: row.reference_id,
            is_read: Boolean(row.is_read),
            created_at: row.created_at,
        }));
        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil notifikasi",
            data: results,
            pagination: (0, pagination_1.buildPaginationMeta)(total, limit, offset),
            meta: {
                total,
                limit,
                offset,
            }
        });
    }
    catch (error) {
        console.error("Get notifications error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
router.patch("/read-all", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const result = await db_1.db.update(schema_1.notifications)
            .set({ is_read: true })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.recipient_id, user.id), (0, drizzle_orm_1.eq)(schema_1.notifications.is_read, false)))
            .returning({ id: schema_1.notifications.id });
        return res.status(200).json({
            success: true,
            message: "Semua notifikasi telah ditandai sudah dibaca",
            data: {
                updatedCount: result.length
            },
        });
    }
    catch (error) {
        console.error("Mark all as read error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
router.patch("/:id/read", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const id = req.params.id;
        const result = await db_1.db.update(schema_1.notifications)
            .set({ is_read: true })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.id, id), (0, drizzle_orm_1.eq)(schema_1.notifications.recipient_id, user.id)))
            .returning({ id: schema_1.notifications.id, is_read: schema_1.notifications.is_read });
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Notifikasi tidak ditemukan",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Notifikasi ditandai sudah dibaca",
            data: result[0],
        });
    }
    catch (error) {
        console.error("Mark as read error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
exports.default = router;
