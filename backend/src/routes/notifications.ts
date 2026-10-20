import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { db } from "../db";
import { notifications } from "../db/schema";
import { eq, desc, count, and, sql } from "drizzle-orm";
import { parsePaginationParams, buildPaginationMeta } from "../utils/pagination";

const router = Router();

router.get("/unread-count", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;

    const [result] = await db.select({
      count: count()
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipient_id, user.id),
        eq(notifications.is_read, false)
      )
    );

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil jumlah notifikasi belum dibaca",
      data: {
        count: result.count
      },
    });
  } catch (error: any) {
    console.error("Get unread-count error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

router.get("/", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const { limit, offset } = parsePaginationParams(req.query, 10, 100);
    const { search, category, type, start_date, end_date } = req.query;

    let searchCond = sql``;
    if (search && typeof search === "string" && search.trim()) {
      const q = `%${search.trim()}%`;
      searchCond = sql`AND (title ILIKE ${q} OR message ILIKE ${q})`;
    }

    let categoryCond = sql``;
    if (category && typeof category === "string" && category !== "Semua") {
      if (category === "Absensi") {
        categoryCond = sql`AND type IN ('ATTENDANCE_REMINDER', 'AGENDA_UPCOMING')`;
      } else if (category === "Izin & Cuti") {
        categoryCond = sql`AND type IN ('LEAVE_PENDING', 'LEAVE_APPROVED', 'LEAVE_REJECTED')`;
      } else if (category === "Sistem") {
        categoryCond = sql`AND type IN ('JOIN_REQUEST_PENDING', 'JOIN_REQUEST_APPROVED', 'JOIN_REQUEST_REJECTED', 'NEW_ANNOUNCEMENT', 'ROLE_CHANGED', 'member_removed')`;
      }
    } else if (type && typeof type === "string") {
      categoryCond = sql`AND type = ${type}`;
    }

    let dateCond = sql``;
    if (start_date && typeof start_date === "string") {
      dateCond = sql`${dateCond} AND (DATE(created_at AT TIME ZONE 'Asia/Jakarta') >= ${start_date}::date)`;
    }
    if (end_date && typeof end_date === "string") {
      dateCond = sql`${dateCond} AND (DATE(created_at AT TIME ZONE 'Asia/Jakarta') <= ${end_date}::date)`;
    }

    // 1. Total count
    const countRes = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM notifications
      WHERE recipient_id = ${user.id}
        ${searchCond}
        ${categoryCond}
        ${dateCond}
    `);
    const total = parseInt(countRes.rows[0]?.total as string, 10) || 0;

    // 2. Fetch paginated records
    const resultsRes = await db.execute(sql`
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

    const results = resultsRes.rows.map((row: any) => ({
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
      pagination: buildPaginationMeta(total, limit, offset),
      meta: {
        total,
        limit,
        offset,
      }
    });
  } catch (error: any) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

router.patch("/read-all", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;

    const result = await db.update(notifications)
      .set({ is_read: true })
      .where(
        and(
          eq(notifications.recipient_id, user.id),
          eq(notifications.is_read, false)
        )
      )
      .returning({ id: notifications.id });

    return res.status(200).json({
      success: true,
      message: "Semua notifikasi telah ditandai sudah dibaca",
      data: {
        updatedCount: result.length
      },
    });
  } catch (error: any) {
    console.error("Mark all as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

router.patch("/:id/read", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const id = req.params.id as string;

    const result = await db.update(notifications)
      .set({ is_read: true })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipient_id, user.id)
        )
      )
      .returning({ id: notifications.id, is_read: notifications.is_read });

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
  } catch (error: any) {
    console.error("Mark as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

export default router;
