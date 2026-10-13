import { Router, Request, Response } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { resolveTenant } from "../utils/tenant";

const router = Router();

router.get("/attendance-stats", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const tenant = await resolveTenant(req, user.id);

    if (!tenant) {
      return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
    }
    const companyId = tenant.companyId;

    // Get company info
    const companyRes = await db.execute(sql`
      SELECT work_start_time, work_days FROM companies WHERE id = ${companyId}
    `);
    const companyRow = companyRes.rows[0] as { work_start_time?: string | null; work_days?: string[] | null } | undefined;
    const workStartTime = companyRow?.work_start_time || null;
    const workDaysConfig = (companyRow?.work_days as string[]) || ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

    // Date calculations for Jakarta
    const now = new Date();
    const jakartaDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const targetMonth = req.query.month ? parseInt(req.query.month as string) : (jakartaDate.getMonth() + 1);
    const targetYear = req.query.year ? parseInt(req.query.year as string) : jakartaDate.getFullYear();

    // 1. Calculate working days in targetMonth
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    let workingDaysCount = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(targetYear, targetMonth - 1, day);
      const name = dayNames[d.getDay()];
      if (workDaysConfig.includes(name)) {
        workingDaysCount++;
      }
    }
    if (workingDaysCount === 0) workingDaysCount = 20;

    // 2. Query today's attendance stats
    const statsQuery = await db.execute(sql`
      WITH company_info AS (
        SELECT work_start_time FROM companies WHERE id = ${companyId}
      ),
      active_members AS (
        SELECT profile_id as id 
        FROM company_members 
        WHERE company_id = ${companyId} AND status = 'active' AND deleted_at IS NULL
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
        (SELECT count(*) FROM active_members) as total_members,
        (SELECT count(*) FROM today_attendances WHERE status = 'Hadir') as total_hadir,
        (SELECT count(*) FROM today_attendances WHERE status = 'Terlambat') as total_terlambat,
        (SELECT count(DISTINCT profile_id) FROM today_leaves) as total_izin,
        (
          SELECT count(m.id) FROM active_members m
          LEFT JOIN today_attendances a ON m.id = a.profile_id
          LEFT JOIN today_leaves l ON m.id = l.profile_id
          WHERE a.profile_id IS NULL AND l.profile_id IS NULL
        ) as total_belum
    `);

    const stats = statsQuery.rows[0];

    // 3. Query monthly attendance stats
    const monthlyAttRes = await db.execute(sql`
      SELECT 
        count(a.id) as total_hadir,
        count(CASE WHEN ${workStartTime}::time IS NOT NULL AND (a.check_in_time AT TIME ZONE 'Asia/Jakarta')::time > ${workStartTime}::time THEN 1 END) as total_terlambat
      FROM attendances a
      WHERE a.company_id = ${companyId}
        AND a.deleted_at IS NULL
        AND EXTRACT(MONTH FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta') = ${targetMonth}
        AND EXTRACT(YEAR FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta') = ${targetYear}
    `);

    // 4. Query monthly leaves
    const monthlyLeavesRes = await db.execute(sql`
      SELECT count(id) as total_izin
      FROM leave_requests
      WHERE company_id = ${companyId}
        AND status = 'Disetujui'
        AND deleted_at IS NULL
        AND (
          (EXTRACT(MONTH FROM start_date) = ${targetMonth} AND EXTRACT(YEAR FROM start_date) = ${targetYear})
          OR
          (EXTRACT(MONTH FROM end_date) = ${targetMonth} AND EXTRACT(YEAR FROM end_date) = ${targetYear})
        )
    `);

    const mAtt = monthlyAttRes.rows[0];
    const mLeave = monthlyLeavesRes.rows[0];
    const mTotalHadir = parseInt(mAtt?.total_hadir as string) || 0;
    const mTotalTerlambat = parseInt(mAtt?.total_terlambat as string) || 0;
    const mOnTime = Math.max(0, mTotalHadir - mTotalTerlambat);
    const mTotalIzin = parseInt(mLeave?.total_izin as string) || 0;

    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    return res.status(200).json({
      success: true,
      message: "Berhasil mendapatkan statistik kehadiran",
      data: {
        hadir: parseInt(stats.total_hadir as string) || 0,
        terlambat: parseInt(stats.total_terlambat as string) || 0,
        izin: parseInt(stats.total_izin as string) || 0,
        belum: parseInt(stats.total_belum as string) || 0,
        total: parseInt(stats.total_members as string) || 0,
        monthly: {
          month: targetMonth,
          year: targetYear,
          month_name: monthNames[targetMonth - 1],
          working_days: workingDaysCount,
          on_time: mOnTime,
          hadir: mTotalHadir,
          terlambat: mTotalTerlambat,
          izin: mTotalIzin,
        }
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
    const tenant = await resolveTenant(req, user.id);

    if (!tenant) {
      return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
    }
    const companyId = tenant.companyId;

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

router.get("/badge-counts", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const tenant = await resolveTenant(req, user.id);

    if (!tenant) {
      return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
    }
    const companyId = tenant.companyId;

    const countsRes = await db.execute(sql`
      SELECT 
        (
          SELECT count(*) 
          FROM leave_requests 
          WHERE company_id = ${companyId} 
            AND status = 'Menunggu' 
            AND deleted_at IS NULL
        ) as pending_leaves,
        (
          SELECT count(*) 
          FROM company_join_requests 
          WHERE company_id = ${companyId} 
            AND status = 'pending' 
            AND deleted_at IS NULL
        ) as pending_joins,
        (
          SELECT count(*) 
          FROM company_exit_requests 
          WHERE company_id = ${companyId} 
            AND status = 'pending' 
            AND deleted_at IS NULL
        ) as pending_exits
    `);

    const row = countsRes.rows[0];
    const pendingLeaves = parseInt(row?.pending_leaves as string) || 0;
    const pendingJoins = parseInt(row?.pending_joins as string) || 0;
    const pendingExits = parseInt(row?.pending_exits as string) || 0;

    return res.status(200).json({
      success: true,
      message: "Berhasil mendapatkan badge counts",
      data: {
        pendingLeaves,
        pendingJoins,
        pendingExits,
        karyawanBadge: pendingJoins + pendingExits,
      }
    });

  } catch (error: any) {
    console.error("Badge counts error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", errors: [error.message] });
  }
});


router.get("/activities", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const tenant = await resolveTenant(req, user.id);

    if (!tenant) {
      return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
    }
    const companyId = tenant.companyId;

    // 1. Leave requests
    const leavesRes = await db.execute(sql`
      SELECT 'leave' as type, p.full_name as author, r.start_date, r.end_date, r.created_at, null as title
      FROM leave_requests r 
      JOIN profiles p ON r.profile_id = p.id 
      WHERE r.company_id = ${companyId} AND r.deleted_at IS NULL
      ORDER BY r.created_at DESC LIMIT 5
    `);

    // 2. New members
    const membersRes = await db.execute(sql`
      SELECT 'join' as type, p.full_name as author, null as start_date, null as end_date, cm.joined_at as created_at, null as title
      FROM company_members cm
      JOIN profiles p ON cm.profile_id = p.id
      WHERE cm.company_id = ${companyId} AND cm.status = 'active' AND cm.deleted_at IS NULL
      ORDER BY cm.joined_at DESC LIMIT 5
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
      ...membersRes.rows,
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
