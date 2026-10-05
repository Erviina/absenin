import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
const router = Router();



router.get("/attendance-stats", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;

    // 1. Get company_id
    const profileRes = await db.execute(sql`SELECT company_id FROM profiles WHERE id = ${user.id} AND deleted_at IS NULL`);
    if (profileRes.rows.length === 0 || !profileRes.rows[0].company_id) {
      return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
    }
    const companyId = profileRes.rows[0].company_id;

    // 2. Query today's attendance stats
    const statsQuery = await db.execute(sql`
      WITH company_info AS (
        SELECT work_start_time FROM companies WHERE id = ${companyId}
      ),
      company_members AS (
        SELECT id FROM profiles WHERE company_id = ${companyId} AND deleted_at IS NULL
      ),
      today_attendances AS (
        SELECT 
          a.profile_id,
          (
            CASE WHEN c.work_start_time IS NOT NULL AND (a.check_in_time AT TIME ZONE 'Asia/Jakarta')::time > c.work_start_time THEN 'Terlambat'
            ELSE 'Hadir' END
          ) as status
        FROM attendances a
        CROSS JOIN company_info c
        WHERE a.company_id = ${companyId} 
          AND DATE(a.check_in_time AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE
          AND a.deleted_at IS NULL
      ),
      today_leaves AS (
        SELECT profile_id FROM leave_requests
        WHERE company_id = ${companyId}
          AND status = 'Disetujui'
          AND start_date <= CURRENT_DATE
          AND end_date >= CURRENT_DATE
          AND deleted_at IS NULL
      )
      SELECT 
        (SELECT count(*) FROM company_members) as total_members,
        (SELECT count(*) FROM today_attendances WHERE status = 'Hadir') as total_hadir,
        (SELECT count(*) FROM today_attendances WHERE status = 'Terlambat') as total_terlambat,
        (SELECT count(DISTINCT profile_id) FROM today_leaves) as total_izin,
        (
          SELECT count(m.id) FROM company_members m
          LEFT JOIN today_attendances a ON m.id = a.profile_id
          LEFT JOIN today_leaves l ON m.id = l.profile_id
          WHERE a.profile_id IS NULL AND l.profile_id IS NULL
        ) as total_belum
    `);

    const stats = statsQuery.rows[0];

    return res.status(200).json({
      success: true,
      message: "Berhasil mendapatkan statistik kehadiran",
      data: {
        hadir: parseInt(stats.total_hadir as string) || 0,
        terlambat: parseInt(stats.total_terlambat as string) || 0,
        izin: parseInt(stats.total_izin as string) || 0,
        belum: parseInt(stats.total_belum as string) || 0,
        total: parseInt(stats.total_members as string) || 0,
      }
    });

  } catch (error: any) {
    console.error("Attendance stats error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", errors: [error.message] });
  }
});

router.get("/leave-stats", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;

    const profileRes = await db.execute(sql`SELECT company_id FROM profiles WHERE id = ${user.id} AND deleted_at IS NULL`);
    if (profileRes.rows.length === 0 || !profileRes.rows[0].company_id) {
      return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
    }
    const companyId = profileRes.rows[0].company_id;

    const leavesRes = await db.execute(sql`
      SELECT 
        c.name as category,
        count(r.id) as total
      FROM leave_requests r
      JOIN leave_categories c ON r.leave_category_id = c.id
      WHERE r.company_id = ${companyId}
        AND r.status = 'Disetujui'
        AND r.start_date <= CURRENT_DATE
        AND r.end_date >= CURRENT_DATE
        AND r.deleted_at IS NULL
      GROUP BY c.name
    `);

    let sakit = 0;
    let cuti = 0;
    let izin = 0;
    let total = 0;

    leavesRes.rows.forEach((row: any) => {
      const count = parseInt(row.total) || 0;
      total += count;
      const cat = (row.category || "").toLowerCase();
      if (cat.includes("sakit")) sakit += count;
      else if (cat.includes("cuti")) cuti += count;
      else izin += count;
    });

    return res.status(200).json({
      success: true,
      message: "Berhasil mendapatkan statistik perizinan",
      data: {
        total,
        sakit,
        cuti,
        izin
      }
    });

  } catch (error: any) {
    console.error("Leave stats error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", errors: [error.message] });
  }
});

router.get("/activities", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;

    const profileRes = await db.execute(sql`SELECT company_id FROM profiles WHERE id = ${user.id} AND deleted_at IS NULL`);
    if (profileRes.rows.length === 0 || !profileRes.rows[0].company_id) {
      return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
    }
    const companyId = profileRes.rows[0].company_id;

    // 1. Leave requests
    const leavesRes = await db.execute(sql`
      SELECT 'leave' as type, p.full_name as author, r.start_date, r.end_date, r.created_at, null as title
      FROM leave_requests r 
      JOIN profiles p ON r.profile_id = p.id 
      WHERE r.company_id = ${companyId} AND r.deleted_at IS NULL
      ORDER BY r.created_at DESC LIMIT 5
    `);

    // 2. New profiles
    const profilesRes = await db.execute(sql`
      SELECT 'join' as type, full_name as author, null as start_date, null as end_date, created_at, null as title
      FROM profiles 
      WHERE company_id = ${companyId} AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 5
    `);

    // 3. News
    const newsRes = await db.execute(sql`
      SELECT 'news' as type, null as author, null as start_date, null as end_date, created_at, title
      FROM news 
      WHERE company_id = ${companyId} AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 5
    `);

    let activities = [
      ...leavesRes.rows,
      ...profilesRes.rows,
      ...newsRes.rows
    ];

    // Sort by created_at desc
    activities.sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());

    // Take top 5
    activities = activities.slice(0, 5);

    return res.status(200).json({
      success: true,
      message: "Berhasil mendapatkan aktivitas terbaru",
      data: activities
    });

  } catch (error: any) {
    console.error("Activities error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", errors: [error.message] });
  }
});

export default router;
