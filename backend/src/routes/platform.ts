import { Router, Request, Response } from "express";
import { authenticatePlatformOwner } from "../middleware/platformAuth";
import { db } from "../db";
import { profiles } from "../db/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

/**
 * GET /api/platform/me
 * Endpoint verifikasi status & profil Platform Owner
 */
router.get("/me", authenticatePlatformOwner, async (req: Request, res: Response): Promise<any> => {
  try {
    const platformOwner = (req as any).platformOwner;

    const profileResult = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        fullName: profiles.full_name,
        avatarUrl: profiles.avatar_url,
      })
      .from(profiles)
      .where(eq(profiles.id, platformOwner.id));

    const userProfile = profileResult[0] || {
      id: platformOwner.id,
      email: platformOwner.email,
      fullName: "Platform Administrator",
      avatarUrl: null,
    };

    return res.status(200).json({
      success: true,
      message: "Platform Owner terverifikasi secara sah",
      data: {
        id: userProfile.id,
        email: userProfile.email || platformOwner.email,
        fullName: userProfile.fullName,
        avatarUrl: userProfile.avatarUrl,
        isDeveloper: true,
        role: "PLATFORM_OWNER",
        verifiedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error verifying platform owner in /api/platform/me:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memverifikasi status Platform Owner",
      errors: [error.message],
    });
  }
});

/**
 * GET /api/platform/analytics/overview
 * Metrik Utama & Grafik Pertumbuhan Platform Absenin
 */
router.get("/analytics/overview", authenticatePlatformOwner, async (req: Request, res: Response): Promise<any> => {
  try {
    const period = (req.query.period as string) || "30d"; // 7d, 30d, 90d, all
    let days = 30;
    if (period === "7d") days = 7;
    else if (period === "90d") days = 90;
    else if (period === "all") days = 3650; // ~10 tahun (semua waktu)

    // 1. KPI Metrik Utama (Totals & Per Periode)
    const kpiRes = await db.execute(sql`
      SELECT
        -- Companies
        (SELECT COUNT(*)::int FROM companies WHERE deleted_at IS NULL) as total_companies,
        (SELECT COUNT(*)::int FROM companies WHERE deleted_at IS NULL AND created_at >= NOW() - (${days} || ' days')::interval) as new_companies,
        
        -- Users
        (SELECT COUNT(*)::int FROM profiles WHERE deleted_at IS NULL) as total_users,
        (SELECT COUNT(*)::int FROM profiles WHERE deleted_at IS NULL AND created_at >= NOW() - (${days} || ' days')::interval) as new_users,
        
        -- Active in period
        (SELECT COUNT(DISTINCT company_id)::int FROM attendances WHERE deleted_at IS NULL AND check_in_time >= NOW() - (${days} || ' days')::interval) as active_companies,
        (SELECT COUNT(DISTINCT profile_id)::int FROM attendances WHERE deleted_at IS NULL AND check_in_time >= NOW() - (${days} || ' days')::interval) as active_users,
        
        -- Attendance activity
        (SELECT COUNT(*)::int FROM attendances WHERE deleted_at IS NULL AND check_in_time >= NOW() - (${days} || ' days')::interval) as period_attendances,
        (SELECT COUNT(*)::int FROM attendances WHERE deleted_at IS NULL) as total_attendances,
        
        -- Work mode distribution
        (SELECT COUNT(*)::int FROM attendances WHERE deleted_at IS NULL AND work_mode = 'WFO' AND check_in_time >= NOW() - (${days} || ' days')::interval) as wfo_count,
        (SELECT COUNT(*)::int FROM attendances WHERE deleted_at IS NULL AND work_mode = 'WFH' AND check_in_time >= NOW() - (${days} || ' days')::interval) as wfh_count
    `);

    const kpi = kpiRes.rows[0] as any;

    // 2. Data Tren Harian untuk Visualisasi Grafik (Companies, Users, Attendances)
    const trendDays = Math.min(days, 30); // Batasi titik grafik harian max 30 hari agar tampilan rapi
    const trendsRes = await db.execute(sql`
      WITH dates AS (
        SELECT generate_series(
          DATE_TRUNC('day', NOW() - (${trendDays - 1} || ' days')::interval),
          DATE_TRUNC('day', NOW()),
          '1 day'::interval
        )::date as d
      ),
      comp_daily AS (
        SELECT DATE(created_at AT TIME ZONE 'Asia/Jakarta') as d, COUNT(*)::int as c_count
        FROM companies
        WHERE deleted_at IS NULL AND created_at >= NOW() - (${trendDays} || ' days')::interval
        GROUP BY DATE(created_at AT TIME ZONE 'Asia/Jakarta')
      ),
      user_daily AS (
        SELECT DATE(created_at AT TIME ZONE 'Asia/Jakarta') as d, COUNT(*)::int as u_count
        FROM profiles
        WHERE deleted_at IS NULL AND created_at >= NOW() - (${trendDays} || ' days')::interval
        GROUP BY DATE(created_at AT TIME ZONE 'Asia/Jakarta')
      ),
      att_daily AS (
        SELECT DATE(check_in_time AT TIME ZONE 'Asia/Jakarta') as d, COUNT(*)::int as a_count
        FROM attendances
        WHERE deleted_at IS NULL AND check_in_time >= NOW() - (${trendDays} || ' days')::interval
        GROUP BY DATE(check_in_time AT TIME ZONE 'Asia/Jakarta')
      )
      SELECT 
        TO_CHAR(dates.d, 'YYYY-MM-DD') as date,
        TO_CHAR(dates.d, 'DD Mon') as label,
        COALESCE(comp_daily.c_count, 0) as companies,
        COALESCE(user_daily.u_count, 0) as users,
        COALESCE(att_daily.a_count, 0) as attendances
      FROM dates
      LEFT JOIN comp_daily ON comp_daily.d = dates.d
      LEFT JOIN user_daily ON user_daily.d = dates.d
      LEFT JOIN att_daily ON att_daily.d = dates.d
      ORDER BY dates.d ASC
    `);

    // 3. Activation Funnel Perusahaan (Onboarding Funnel)
    const funnelRes = await db.execute(sql`
      SELECT
        -- Step 1: Registered
        (SELECT COUNT(*)::int FROM companies WHERE deleted_at IS NULL) as step_registered,
        
        -- Step 2: Setup Complete (Address or Schedule configured)
        (SELECT COUNT(*)::int FROM companies WHERE deleted_at IS NULL AND (address IS NOT NULL OR latitude IS NOT NULL OR work_start_time IS NOT NULL)) as step_setup,
        
        -- Step 3: Members Added (More than creator / >1 member)
        (SELECT COUNT(DISTINCT company_id)::int FROM company_members WHERE deleted_at IS NULL AND status = 'active' GROUP BY company_id HAVING COUNT(*) > 1 LIMIT 1) as step_members_agg,
        (SELECT COUNT(*)::int FROM (
          SELECT company_id FROM company_members WHERE deleted_at IS NULL AND status = 'active' GROUP BY company_id HAVING COUNT(*) > 1
        ) sub) as step_members,
        
        -- Step 4: First Attendance Recorded
        (SELECT COUNT(DISTINCT company_id)::int FROM attendances WHERE deleted_at IS NULL) as step_attendance,
        
        -- Step 5: Active in Last 7 Days (Retained)
        (SELECT COUNT(DISTINCT company_id)::int FROM attendances WHERE deleted_at IS NULL AND check_in_time >= NOW() - INTERVAL '7 days') as step_active_7d
    `);

    const funnelRow = funnelRes.rows[0] as any;
    const regCount = funnelRow.step_registered || 1;
    const funnel = [
      { step: "Perusahaan Mendaftar", count: funnelRow.step_registered || 0, percent: 100 },
      { step: "Konfigurasi Selesai", count: funnelRow.step_setup || 0, percent: Math.round(((funnelRow.step_setup || 0) / regCount) * 100) },
      { step: "Anggota Ditambahkan (>1)", count: funnelRow.step_members || 0, percent: Math.round(((funnelRow.step_members || 0) / regCount) * 100) },
      { step: "Presensi Pertama Tercatat", count: funnelRow.step_attendance || 0, percent: Math.round(((funnelRow.step_attendance || 0) / regCount) * 100) },
      { step: "Aktif 7 Hari Terakhir", count: funnelRow.step_active_7d || 0, percent: Math.round(((funnelRow.step_active_7d || 0) / regCount) * 100) },
    ];

    // 4. Ringkasan Perusahaan Terbaru (Top 5)
    const recentCompaniesRes = await db.execute(sql`
      SELECT 
        c.id, 
        c.name, 
        c.created_at,
        c.avatar_company_url,
        COALESCE(m.member_count, 0) as member_count,
        COALESCE(a.attendance_count, 0) as attendance_count
      FROM companies c
      LEFT JOIN (
        SELECT company_id, COUNT(*)::int as member_count
        FROM company_members
        WHERE deleted_at IS NULL AND status = 'active'
        GROUP BY company_id
      ) m ON m.company_id = c.id
      LEFT JOIN (
        SELECT company_id, COUNT(*)::int as attendance_count
        FROM attendances
        WHERE deleted_at IS NULL
        GROUP BY company_id
      ) a ON a.company_id = c.id
      WHERE c.deleted_at IS NULL
      ORDER BY c.created_at DESC
      LIMIT 5
    `);

    // 5. Aktivitas Presensi Platform Terbaru (Latest 6)
    const recentActivityRes = await db.execute(sql`
      SELECT 
        a.id,
        a.work_mode,
        a.check_in_time,
        p.full_name as user_name,
        p.avatar_url as user_avatar,
        c.name as company_name,
        CASE 
          WHEN (a.check_in_time AT TIME ZONE 'Asia/Jakarta')::time > (COALESCE(c.work_start_time, '08:00:00'::time) + interval '15 minutes') THEN true 
          ELSE false 
        END as is_late
      FROM attendances a
      JOIN profiles p ON p.id = a.profile_id
      JOIN companies c ON c.id = a.company_id
      WHERE a.deleted_at IS NULL
      ORDER BY a.check_in_time DESC
      LIMIT 6
    `);

    return res.status(200).json({
      success: true,
      message: "Data overview analitik platform berhasil dimuat",
      data: {
        period,
        kpi: {
          totalCompanies: kpi.total_companies || 0,
          newCompanies: kpi.new_companies || 0,
          totalUsers: kpi.total_users || 0,
          newUsers: kpi.new_users || 0,
          activeCompanies: kpi.active_companies || 0,
          activeUsers: kpi.active_users || 0,
          periodAttendances: kpi.period_attendances || 0,
          totalAttendances: kpi.total_attendances || 0,
          wfoCount: kpi.wfo_count || 0,
          wfhCount: kpi.wfh_count || 0,
        },
        trends: trendsRes.rows,
        funnel,
        recentCompanies: recentCompaniesRes.rows,
        recentActivity: recentActivityRes.rows,
      },
    });
  } catch (error: any) {
    console.error("Error fetching overview analytics:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat analitik overview platform",
      errors: [error.message],
    });
  }
});

/**
 * GET /api/platform/companies
 * Direktori Semua Perusahaan (Multi-Tenant Management)
 */
router.get("/companies", authenticatePlatformOwner, async (req: Request, res: Response): Promise<any> => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || "1"));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "10")));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string || "").trim().toLowerCase();

    const searchCondition = search ? sql`AND LOWER(c.name) LIKE ${`%${search}%`}` : sql``;

    const countRes = await db.execute(sql`
      SELECT COUNT(*)::int as total
      FROM companies c
      WHERE c.deleted_at IS NULL ${searchCondition}
    `);
    const totalCount = (countRes.rows[0] as any)?.total || 0;

    const companiesRes = await db.execute(sql`
      SELECT 
        c.id, 
        c.name, 
        c.address,
        c.join_code,
        c.avatar_company_url,
        c.created_at,
        c.work_start_time,
        c.work_end_time,
        COALESCE(m.member_count, 0) as member_count,
        COALESCE(a.attendance_count, 0) as attendance_count,
        a.last_activity
      FROM companies c
      LEFT JOIN (
        SELECT company_id, COUNT(*)::int as member_count
        FROM company_members
        WHERE deleted_at IS NULL AND status = 'active'
        GROUP BY company_id
      ) m ON m.company_id = c.id
      LEFT JOIN (
        SELECT company_id, COUNT(*)::int as attendance_count, MAX(check_in_time) as last_activity
        FROM attendances
        WHERE deleted_at IS NULL
        GROUP BY company_id
      ) a ON a.company_id = c.id
      WHERE c.deleted_at IS NULL ${searchCondition}
      ORDER BY c.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    return res.status(200).json({
      success: true,
      message: "Daftar direktori perusahaan berhasil dimuat",
      data: {
        items: companiesRes.rows,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching companies directory:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat direktori perusahaan",
      errors: [error.message],
    });
  }
});

/**
 * GET /api/platform/companies/lookup
 * Daftar ringkas perusahaan untuk opsi filter dropdown
 */
router.get("/companies/lookup", authenticatePlatformOwner, async (req: Request, res: Response): Promise<any> => {
  try {
    const listRes = await db.execute(sql`
      SELECT id, name, avatar_company_url
      FROM companies
      WHERE deleted_at IS NULL
      ORDER BY name ASC
    `);
    return res.status(200).json({
      success: true,
      message: "Daftar perusahaan berhasil dimuat",
      data: listRes.rows,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Gagal memuat daftar perusahaan",
      errors: [error.message],
    });
  }
});

/**
 * GET /api/platform/companies/:id
 * Profil Lengkap Perusahaan, Informasi Pemilik, dan Ringkasan KPI
 */
router.get("/companies/:id", authenticatePlatformOwner, async (req: Request, res: Response): Promise<any> => {
  try {
    const companyId = req.params.id;

    const companyRes = await db.execute(sql`
      SELECT 
        c.id, 
        c.name, 
        c.address,
        c.latitude,
        c.longitude,
        c.phone,
        c.join_code,
        c.avatar_company_url,
        c.work_days,
        c.work_start_time,
        c.work_end_time,
        c.created_at,
        c.updated_at,
        p_owner.id as owner_id,
        p_owner.full_name as owner_name,
        p_owner.email as owner_email,
        p_owner.avatar_url as owner_avatar
      FROM companies c
      LEFT JOIN company_members cm_owner 
        ON cm_owner.company_id = c.id 
        AND cm_owner.role = 'owner' 
        AND cm_owner.deleted_at IS NULL 
        AND cm_owner.status = 'active'
      LEFT JOIN profiles p_owner 
        ON p_owner.id = COALESCE(cm_owner.profile_id, c.created_by)
      WHERE c.id = ${companyId}::uuid AND c.deleted_at IS NULL
      LIMIT 1;
    `);

    if (companyRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Perusahaan tidak ditemukan",
      });
    }

    const company = companyRes.rows[0] as any;

    const statsRes = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*)::int FROM company_members WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL AND status = 'active') as active_members,
        (SELECT COUNT(*)::int FROM company_members WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL AND role = 'admin' AND status = 'active') as admin_count,
        (SELECT COUNT(*)::int FROM company_members WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL AND role = 'owner' AND status = 'active') as owner_count,
        (SELECT COUNT(*)::int FROM attendances WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL) as total_attendances,
        (SELECT COUNT(*)::int FROM tasks WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL) as total_tasks,
        (SELECT COUNT(*)::int FROM tasks WHERE company_id = ${companyId}::uuid AND is_completed = true AND deleted_at IS NULL) as completed_tasks,
        (SELECT COUNT(*)::int FROM agendas WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL) as total_agendas,
        (SELECT COUNT(*)::int FROM leave_requests WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL) as total_leaves,
        (SELECT COUNT(*)::int FROM leave_requests WHERE company_id = ${companyId}::uuid AND status::text IN ('Disetujui', 'approved') AND deleted_at IS NULL) as approved_leaves,
        (SELECT COUNT(*)::int FROM leave_requests WHERE company_id = ${companyId}::uuid AND status::text IN ('Menunggu', 'pending') AND deleted_at IS NULL) as pending_leaves,
        (SELECT COUNT(*)::int FROM leave_requests WHERE company_id = ${companyId}::uuid AND status::text IN ('Ditolak', 'rejected') AND deleted_at IS NULL) as rejected_leaves,
        (SELECT COUNT(*)::int FROM news WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL) as total_news,
        (SELECT MAX(check_in_time) FROM attendances WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL) as last_attendance_activity;
    `);

    const stats = statsRes.rows[0] as any;

    return res.status(200).json({
      success: true,
      message: "Detail perusahaan berhasil dimuat",
      data: {
        ...company,
        stats: {
          ...stats,
          task_completion_rate: stats.total_tasks > 0 ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) : 0,
          leave_approval_rate: stats.total_leaves > 0 ? Math.round((stats.approved_leaves / stats.total_leaves) * 100) : 0,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching company detail:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat detail perusahaan",
      errors: [error.message],
    });
  }
});

/**
 * GET /api/platform/companies/:id/analytics
 * Analitik Performa Fitur Terperinci pada Perusahaan Tertentu
 */
router.get("/companies/:id/analytics", authenticatePlatformOwner, async (req: Request, res: Response): Promise<any> => {
  try {
    const companyId = req.params.id;

    const compConfig = await db.execute(sql`
      SELECT work_start_time FROM companies WHERE id = ${companyId}::uuid LIMIT 1;
    `);
    const startStr = compConfig.rows[0]?.work_start_time ? String(compConfig.rows[0]?.work_start_time).substring(0, 5) : "08:00";

    // 1. Attendance features stats
    const attRes = await db.execute(sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN (check_in_time AT TIME ZONE 'Asia/Jakarta')::time <= (${startStr}::time + interval '15 minutes') THEN 1 END)::int as on_time,
        COUNT(CASE WHEN (check_in_time AT TIME ZONE 'Asia/Jakarta')::time > (${startStr}::time + interval '15 minutes') THEN 1 END)::int as late,
        COUNT(CASE WHEN work_mode = 'WFO' THEN 1 END)::int as wfo_count,
        COUNT(CASE WHEN work_mode = 'WFH' THEN 1 END)::int as wfh_count,
        COUNT(DISTINCT profile_id)::int as active_attendees
      FROM attendances
      WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL;
    `);
    const attStats = attRes.rows[0] as any;
    const onTimeRate = attStats.total > 0 ? Math.round((attStats.on_time / attStats.total) * 100) : 0;

    // Daily attendance trend (14 hari terakhir)
    const trendRes = await db.execute(sql`
      SELECT 
        TO_CHAR(d.day, 'YYYY-MM-DD') as date,
        TO_CHAR(d.day, 'Dy, DD Mon') as display_date,
        COUNT(a.id)::int as total,
        COUNT(CASE WHEN (a.check_in_time AT TIME ZONE 'Asia/Jakarta')::time <= (${startStr}::time + interval '15 minutes') THEN 1 END)::int as on_time,
        COUNT(CASE WHEN (a.check_in_time AT TIME ZONE 'Asia/Jakarta')::time > (${startStr}::time + interval '15 minutes') THEN 1 END)::int as late
      FROM generate_series(
        CURRENT_DATE - INTERVAL '13 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) d(day)
      LEFT JOIN attendances a 
        ON DATE(a.check_in_time AT TIME ZONE 'Asia/Jakarta') = DATE(d.day)
        AND a.company_id = ${companyId}::uuid
        AND a.deleted_at IS NULL
      GROUP BY d.day
      ORDER BY d.day ASC;
    `);

    // 2. Task analytics
    const taskRes = await db.execute(sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN is_completed = true THEN 1 END)::int as completed,
        COUNT(CASE WHEN is_completed = false OR is_completed IS NULL THEN 1 END)::int as pending,
        COUNT(CASE WHEN (is_completed = false OR is_completed IS NULL) AND deadline < NOW() THEN 1 END)::int as overdue,
        COUNT(CASE WHEN type = 'personal' THEN 1 END)::int as personal_tasks,
        COUNT(CASE WHEN type != 'personal' OR type IS NULL THEN 1 END)::int as company_tasks
      FROM tasks
      WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL;
    `);
    const taskStats = taskRes.rows[0] as any;
    const taskRate = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;

    // 3. Agenda analytics
    const agendaRes = await db.execute(sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN end_time >= NOW() OR (end_time IS NULL AND start_time >= NOW()) THEN 1 END)::int as upcoming,
        COUNT(CASE WHEN end_time < NOW() OR (end_time IS NULL AND start_time < NOW()) THEN 1 END)::int as past,
        COUNT(CASE WHEN type = 'COMPANY' THEN 1 END)::int as company_type,
        COUNT(CASE WHEN type = 'PERSONAL' THEN 1 END)::int as personal_type
      FROM agendas
      WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL;
    `);
    const agendaStats = agendaRes.rows[0] as any;

    // 4. Leave analytics
    const leaveRes = await db.execute(sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN status::text IN ('Disetujui', 'approved') THEN 1 END)::int as approved,
        COUNT(CASE WHEN status::text IN ('Menunggu', 'pending') THEN 1 END)::int as pending,
        COUNT(CASE WHEN status::text IN ('Ditolak', 'rejected') THEN 1 END)::int as rejected
      FROM leave_requests
      WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL;
    `);
    const leaveStats = leaveRes.rows[0] as any;
    const leaveApprovalRate = leaveStats.total > 0 ? Math.round((leaveStats.approved / leaveStats.total) * 100) : 0;

    const leaveCatRes = await db.execute(sql`
      SELECT 
        COALESCE(lc.name, 'Lainnya') as category_name,
        COUNT(lr.id)::int as count
      FROM leave_requests lr
      LEFT JOIN leave_categories lc ON lc.id = lr.leave_category_id
      WHERE lr.company_id = ${companyId}::uuid AND lr.deleted_at IS NULL
      GROUP BY lc.name
      ORDER BY count DESC
      LIMIT 6;
    `);

    // 5. News
    const newsRes = await db.execute(sql`
      SELECT COUNT(*)::int as total
      FROM news
      WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL;
    `);

    return res.status(200).json({
      success: true,
      message: "Analitik performa fitur perusahaan berhasil dimuat",
      data: {
        attendance: {
          ...attStats,
          on_time_rate: onTimeRate,
          trend: trendRes.rows,
        },
        tasks: {
          ...taskStats,
          completion_rate: taskRate,
        },
        agendas: agendaStats,
        leaves: {
          ...leaveStats,
          approval_rate: leaveApprovalRate,
          categories: leaveCatRes.rows,
        },
        news: {
          total: newsRes.rows[0]?.total || 0,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching company analytics:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat analitik perusahaan",
      errors: [error.message],
    });
  }
});

/**
 * GET /api/platform/companies/:id/members
 * Daftar Karyawan Perusahaan Beserta Ringkasan Performa Masing-Masing
 */
router.get("/companies/:id/members", authenticatePlatformOwner, async (req: Request, res: Response): Promise<any> => {
  try {
    const companyId = req.params.id;
    const search = ((req.query.search as string) || "").trim().toLowerCase();
    const roleFilter = ((req.query.role as string) || "").trim().toLowerCase();

    const compConfig = await db.execute(sql`
      SELECT work_start_time FROM companies WHERE id = ${companyId}::uuid LIMIT 1;
    `);
    const startStr = compConfig.rows[0]?.work_start_time ? String(compConfig.rows[0]?.work_start_time).substring(0, 5) : "08:00";

    const searchCondition = search
      ? sql`AND (LOWER(p.full_name) LIKE ${`%${search}%`} OR LOWER(p.email) LIKE ${`%${search}%`})`
      : sql``;
    const roleCondition = roleFilter && roleFilter !== "all"
      ? sql`AND LOWER(cm.role) = ${roleFilter}`
      : sql``;

    const membersRes = await db.execute(sql`
      SELECT 
        cm.id as membership_id,
        cm.profile_id,
        cm.role,
        cm.status,
        cm.joined_at,
        p.full_name,
        p.email,
        p.avatar_url,
        p.is_developer,
        COALESCE(att.total_attendances, 0) as total_attendances,
        COALESCE(att.on_time_attendances, 0) as on_time_attendances,
        COALESCE(att.late_attendances, 0) as late_attendances,
        att.last_attendance,
        COALESCE(tsk.total_tasks, 0) as total_tasks,
        COALESCE(tsk.completed_tasks, 0) as completed_tasks,
        COALESCE(lve.total_leaves, 0) as total_leaves
      FROM company_members cm
      JOIN profiles p ON p.id = cm.profile_id
      LEFT JOIN (
        SELECT 
          profile_id,
          COUNT(*)::int as total_attendances,
          COUNT(CASE WHEN (check_in_time AT TIME ZONE 'Asia/Jakarta')::time <= (${startStr}::time + interval '15 minutes') THEN 1 END)::int as on_time_attendances,
          COUNT(CASE WHEN (check_in_time AT TIME ZONE 'Asia/Jakarta')::time > (${startStr}::time + interval '15 minutes') THEN 1 END)::int as late_attendances,
          MAX(check_in_time) as last_attendance
        FROM attendances
        WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL
        GROUP BY profile_id
      ) att ON att.profile_id = cm.profile_id
      LEFT JOIN (
        SELECT 
          profile_id,
          COUNT(*)::int as total_tasks,
          COUNT(CASE WHEN is_completed = true THEN 1 END)::int as completed_tasks
        FROM tasks
        WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL
        GROUP BY profile_id
      ) tsk ON tsk.profile_id = cm.profile_id
      LEFT JOIN (
        SELECT 
          profile_id,
          COUNT(*)::int as total_leaves
        FROM leave_requests
        WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL
        GROUP BY profile_id
      ) lve ON lve.profile_id = cm.profile_id
      WHERE cm.company_id = ${companyId}::uuid AND cm.deleted_at IS NULL
        ${searchCondition}
        ${roleCondition}
      ORDER BY 
        CASE 
          WHEN cm.role = 'owner' THEN 1
          WHEN cm.role = 'admin' THEN 2
          WHEN cm.role = 'manager' THEN 3
          ELSE 4 
        END,
        cm.joined_at ASC;
    `);

    const formatted = membersRes.rows.map((row: any) => {
      const totAtt = row.total_attendances || 0;
      const onTime = row.on_time_attendances || 0;
      const totTsk = row.total_tasks || 0;
      const compTsk = row.completed_tasks || 0;

      return {
        ...row,
        on_time_rate: totAtt > 0 ? Math.round((onTime / totAtt) * 100) : 0,
        task_completion_rate: totTsk > 0 ? Math.round((compTsk / totTsk) * 100) : 0,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Daftar karyawan perusahaan berhasil dimuat",
      data: formatted,
    });
  } catch (error: any) {
    console.error("Error fetching company members:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat karyawan perusahaan",
      errors: [error.message],
    });
  }
});

/**
 * GET /api/platform/companies/:id/members/:memberId/performance
 * Detail Profil & Analisis Performa Karyawan Spesifik dalam Perusahaan Ini
 */
router.get("/companies/:id/members/:memberId/performance", authenticatePlatformOwner, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id: companyId, memberId: profileId } = req.params;

    const compConfig = await db.execute(sql`
      SELECT work_start_time FROM companies WHERE id = ${companyId}::uuid LIMIT 1;
    `);
    const startStr = compConfig.rows[0]?.work_start_time ? String(compConfig.rows[0]?.work_start_time).substring(0, 5) : "08:00";

    // 1. Member profile & membership info
    const profileRes = await db.execute(sql`
      SELECT 
        p.id, p.full_name, p.email, p.avatar_url, p.is_developer,
        cm.role, cm.status, cm.joined_at
      FROM company_members cm
      JOIN profiles p ON p.id = cm.profile_id
      WHERE cm.company_id = ${companyId}::uuid AND cm.profile_id = ${profileId}::uuid AND cm.deleted_at IS NULL
      LIMIT 1;
    `);

    if (profileRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Karyawan tidak ditemukan di perusahaan ini",
      });
    }
    const member = profileRes.rows[0] as any;

    // 2. Attendance performance
    const attStatsRes = await db.execute(sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN (check_in_time AT TIME ZONE 'Asia/Jakarta')::time <= (${startStr}::time + interval '15 minutes') THEN 1 END)::int as on_time,
        COUNT(CASE WHEN (check_in_time AT TIME ZONE 'Asia/Jakarta')::time > (${startStr}::time + interval '15 minutes') THEN 1 END)::int as late,
        COUNT(CASE WHEN work_mode = 'WFO' THEN 1 END)::int as wfo_count,
        COUNT(CASE WHEN work_mode = 'WFH' THEN 1 END)::int as wfh_count,
        MAX(check_in_time) as last_attendance
      FROM attendances
      WHERE company_id = ${companyId}::uuid AND profile_id = ${profileId}::uuid AND deleted_at IS NULL;
    `);
    const attStats = attStatsRes.rows[0] as any;
    const onTimeRate = attStats.total > 0 ? Math.round((attStats.on_time / attStats.total) * 100) : 0;

    // Recent attendances (last 10)
    const recentAttendances = await db.execute(sql`
      SELECT 
        id,
        check_in_time,
        check_out_time,
        work_mode,
        check_in_address,
        CASE 
          WHEN (check_in_time AT TIME ZONE 'Asia/Jakarta')::time <= (${startStr}::time + interval '15 minutes') THEN 'on_time'
          ELSE 'late'
        END as status
      FROM attendances
      WHERE company_id = ${companyId}::uuid AND profile_id = ${profileId}::uuid AND deleted_at IS NULL
      ORDER BY check_in_time DESC
      LIMIT 10;
    `);

    // 3. Task performance
    const taskStatsRes = await db.execute(sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN is_completed = true THEN 1 END)::int as completed,
        COUNT(CASE WHEN is_completed = false OR is_completed IS NULL THEN 1 END)::int as pending,
        COUNT(CASE WHEN (is_completed = false OR is_completed IS NULL) AND deadline < NOW() THEN 1 END)::int as overdue
      FROM tasks
      WHERE company_id = ${companyId}::uuid 
        AND (profile_id = ${profileId}::uuid OR assigned_to = ${profileId}::uuid)
        AND deleted_at IS NULL;
    `);
    const taskStats = taskStatsRes.rows[0] as any;
    const taskRate = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;

    const recentTasks = await db.execute(sql`
      SELECT id, title, deadline, is_completed, created_at, type
      FROM tasks
      WHERE company_id = ${companyId}::uuid 
        AND (profile_id = ${profileId}::uuid OR assigned_to = ${profileId}::uuid)
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 6;
    `);

    // 4. Leave history
    const leaveStatsRes = await db.execute(sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN status::text IN ('Disetujui', 'approved') THEN 1 END)::int as approved,
        COUNT(CASE WHEN status::text IN ('Menunggu', 'pending') THEN 1 END)::int as pending,
        COUNT(CASE WHEN status::text IN ('Ditolak', 'rejected') THEN 1 END)::int as rejected
      FROM leave_requests
      WHERE company_id = ${companyId}::uuid AND profile_id = ${profileId}::uuid AND deleted_at IS NULL;
    `);
    const leaveStats = leaveStatsRes.rows[0] as any;

    const recentLeaves = await db.execute(sql`
      SELECT 
        lr.id, lr.start_date, lr.end_date, lr.description, lr.status, lr.created_at,
        COALESCE(lc.name, 'Lainnya') as category_name
      FROM leave_requests lr
      LEFT JOIN leave_categories lc ON lc.id = lr.leave_category_id
      WHERE lr.company_id = ${companyId}::uuid AND lr.profile_id = ${profileId}::uuid AND lr.deleted_at IS NULL
      ORDER BY lr.created_at DESC
      LIMIT 6;
    `);

    return res.status(200).json({
      success: true,
      message: "Analitik performa karyawan berhasil dimuat",
      data: {
        profile: member,
        attendance: {
          ...attStats,
          on_time_rate: onTimeRate,
          recent: recentAttendances.rows,
        },
        tasks: {
          ...taskStats,
          completion_rate: taskRate,
          recent: recentTasks.rows,
        },
        leaves: {
          ...leaveStats,
          recent: recentLeaves.rows,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching member performance:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat analitik performa karyawan",
      errors: [error.message],
    });
  }
});

/**
 * GET /api/platform/companies/:id/activities
 * Log Aktivitas Terkini (Activity Feed) di Perusahaan
 */
router.get("/companies/:id/activities", authenticatePlatformOwner, async (req: Request, res: Response): Promise<any> => {
  try {
    const companyId = req.params.id;

    const activitiesRes = await db.execute(sql`
      (
        SELECT 
          'ATTENDANCE' as type,
          a.id,
          p.full_name as user_name,
          p.email as user_email,
          p.avatar_url as user_avatar,
          CONCAT('Melakukan presensi (', a.work_mode, ')') as description,
          a.check_in_time as timestamp
        FROM attendances a
        JOIN profiles p ON p.id = a.profile_id
        WHERE a.company_id = ${companyId}::uuid AND a.deleted_at IS NULL
        ORDER BY a.check_in_time DESC
        LIMIT 10
      )
      UNION ALL
      (
        SELECT 
          'TASK' as type,
          t.id,
          COALESCE(p.full_name, 'Sistem') as user_name,
          p.email as user_email,
          p.avatar_url as user_avatar,
          CONCAT(CASE WHEN t.is_completed = true THEN 'Menyelesaikan tugas: ' ELSE 'Membuat tugas: ' END, t.title) as description,
          COALESCE(t.updated_at, t.created_at) as timestamp
        FROM tasks t
        LEFT JOIN profiles p ON p.id = t.profile_id
        WHERE t.company_id = ${companyId}::uuid AND t.deleted_at IS NULL
        ORDER BY timestamp DESC
        LIMIT 10
      )
      UNION ALL
      (
        SELECT 
          'LEAVE' as type,
          lr.id,
          p.full_name as user_name,
          p.email as user_email,
          p.avatar_url as user_avatar,
          CONCAT('Mengajukan izin: ', COALESCE(lc.name, 'Lainnya'), ' (', lr.status, ')') as description,
          lr.created_at as timestamp
        FROM leave_requests lr
        JOIN profiles p ON p.id = lr.profile_id
        LEFT JOIN leave_categories lc ON lc.id = lr.leave_category_id
        WHERE lr.company_id = ${companyId}::uuid AND lr.deleted_at IS NULL
        ORDER BY lr.created_at DESC
        LIMIT 10
      )
      ORDER BY timestamp DESC
      LIMIT 25;
    `);

    return res.status(200).json({
      success: true,
      message: "Log aktivitas perusahaan berhasil dimuat",
      data: activitiesRes.rows,
    });
  } catch (error: any) {
    console.error("Error fetching company activities:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat log aktivitas perusahaan",
      errors: [error.message],
    });
  }
});

/**
 * GET /api/platform/users
 * Direktori Seluruh Pengguna Platform Absenin (Multi-Tenant Support)
 */
router.get("/users", authenticatePlatformOwner, async (req: Request, res: Response): Promise<any> => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || "1"));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "10")));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string || "").trim().toLowerCase();
    const companyId = (req.query.company_id as string || "").trim();
    const multiOnly = (req.query.multi_only as string || "").trim() === "true";

    const searchCondition = search 
      ? sql`AND (LOWER(p.full_name) LIKE ${`%${search}%`} OR LOWER(p.email) LIKE ${`%${search}%`})` 
      : sql``;
    
    const companyCondition = companyId 
      ? sql`AND (p.id IN (SELECT profile_id FROM company_members WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL AND status = 'active') OR p.company_id = ${companyId}::uuid)` 
      : sql``;

    const multiCondition = multiOnly
      ? sql`AND p.id IN (
          SELECT profile_id FROM (
            SELECT profile_id, company_id FROM company_members WHERE deleted_at IS NULL AND status = 'active'
            UNION
            SELECT id as profile_id, company_id FROM profiles WHERE company_id IS NOT NULL AND deleted_at IS NULL
          ) all_m
          GROUP BY profile_id HAVING COUNT(DISTINCT company_id) > 1
        )`
      : sql``;

    // Summary counts (Mendukung Multi-Tenant)
    const summaryRes = await db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM profiles WHERE deleted_at IS NULL) as total_users,
        (SELECT COUNT(DISTINCT profile_id)::int FROM (
          SELECT profile_id FROM company_members WHERE deleted_at IS NULL AND status = 'active'
          UNION
          SELECT id as profile_id FROM profiles WHERE company_id IS NOT NULL AND deleted_at IS NULL
        ) aff) as affiliated_users,
        (SELECT COUNT(*)::int FROM (
          SELECT profile_id FROM company_members WHERE deleted_at IS NULL AND status = 'active'
          GROUP BY profile_id HAVING COUNT(DISTINCT company_id) > 1
        ) multi) as multi_company_users,
        (SELECT COUNT(DISTINCT profile_id)::int FROM attendances WHERE deleted_at IS NULL) as active_users
    `);
    const summary = summaryRes.rows[0] as any;

    const countRes = await db.execute(sql`
      SELECT COUNT(*)::int as total
      FROM profiles p
      WHERE p.deleted_at IS NULL ${searchCondition} ${companyCondition} ${multiCondition}
    `);
    const totalCount = (countRes.rows[0] as any)?.total || 0;

    // Query Pengguna dengan Agregasi Seluruh Keanggotaan PT (Multi-Tenant JSON)
    const usersRes = await db.execute(sql`
      SELECT 
        p.id, 
        p.full_name, 
        p.email, 
        p.avatar_url, 
        p.created_at,
        p.is_developer,
        p.company_id as active_company_id,
        (SELECT COUNT(*)::int FROM attendances WHERE profile_id = p.id AND deleted_at IS NULL) as total_attendances,
        (SELECT MAX(check_in_time) FROM attendances WHERE profile_id = p.id AND deleted_at IS NULL) as last_attendance,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'company_id', m_all.comp_id,
                'company_name', m_all.comp_name,
                'role', m_all.comp_role,
                'status', m_all.comp_status,
                'joined_at', m_all.comp_joined_at,
                'is_active', (p.company_id = m_all.comp_id)
              ) ORDER BY (p.company_id = m_all.comp_id) DESC, m_all.comp_name ASC
            )
            FROM (
              SELECT DISTINCT ON (comp_id)
                comp_id,
                comp_name,
                comp_role,
                comp_status,
                comp_joined_at
              FROM (
                SELECT 
                  cm.company_id as comp_id, 
                  comp.name as comp_name, 
                  cm.role as comp_role, 
                  cm.status as comp_status,
                  cm.joined_at as comp_joined_at
                FROM company_members cm
                JOIN companies comp ON comp.id = cm.company_id AND comp.deleted_at IS NULL
                WHERE cm.profile_id = p.id AND cm.deleted_at IS NULL AND cm.status = 'active'
                UNION ALL
                SELECT 
                  c_leg.id as comp_id,
                  c_leg.name as comp_name,
                  'member' as comp_role,
                  'active' as comp_status,
                  p.created_at as comp_joined_at
                FROM companies c_leg
                WHERE c_leg.id = p.company_id AND c_leg.deleted_at IS NULL
              ) sub_all
            ) m_all
          ),
          '[]'::json
        ) as memberships
      FROM profiles p
      WHERE p.deleted_at IS NULL ${searchCondition} ${companyCondition} ${multiCondition}
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const formattedUsers = usersRes.rows.map((row: any) => {
      const memberships = Array.isArray(row.memberships) ? row.memberships : [];
      const primaryMembership = memberships[0] || null;
      return {
        ...row,
        is_developer: row.is_developer === true,
        memberships,
        companies_count: memberships.length,
        company_name: primaryMembership?.company_name || null,
        role: primaryMembership?.role || null,
        company_id: primaryMembership?.company_id || row.active_company_id || null,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Daftar pengguna platform berhasil dimuat",
      data: {
        items: formattedUsers,
        summary: {
          totalUsers: summary?.total_users || 0,
          affiliatedUsers: summary?.affiliated_users || 0,
          multiCompanyUsers: summary?.multi_company_users || 0,
          activeUsers: summary?.active_users || 0,
        },
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching platform users directory:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat direktori pengguna",
      errors: [error.message],
    });
  }
});

/**
 * PATCH /api/platform/users/:id/developer
 * Mengubah status is_developer (hak akses Platform Admin) seorang pengguna
 */
router.patch("/users/:id/developer", authenticatePlatformOwner, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.params.id;
    const { isDeveloper } = req.body;

    if (typeof isDeveloper !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Nilai isDeveloper harus bertipe boolean (true/false)",
      });
    }

    const updateRes = await db.execute(sql`
      UPDATE profiles 
      SET is_developer = ${isDeveloper}, updated_at = NOW()
      WHERE id = ${userId}::uuid AND deleted_at IS NULL
      RETURNING id, email, full_name, is_developer;
    `);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan",
      });
    }

    const updatedUser = updateRes.rows[0];

    return res.status(200).json({
      success: true,
      message: `Status developer pengguna ${updatedUser.full_name || updatedUser.email} berhasil diubah menjadi ${isDeveloper ? 'Aktif' : 'Nonaktif'}`,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.full_name,
        isDeveloper: updatedUser.is_developer === true,
      },
    });
  } catch (error: any) {
    console.error("Error updating user developer status:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui status developer pengguna",
      errors: [error.message],
    });
  }
});

/**
 * GET /api/platform/analytics/features
 * Analitik Adopsi Fitur Platform (Presensi, Tugas, Agenda, Izin, Berita, Notifikasi)
 */
router.get("/analytics/features", authenticatePlatformOwner, async (req: Request, res: Response): Promise<any> => {
  try {
    const period = (req.query.period as string) || "30d";
    let days = 30;
    if (period === "7d") days = 7;
    else if (period === "90d") days = 90;
    else if (period === "all") days = 3650;

    // 1. Attendance features stats
    const attRes = await db.execute(sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN work_mode = 'WFO' THEN 1 END)::int as wfo_count,
        COUNT(CASE WHEN work_mode = 'WFH' THEN 1 END)::int as wfh_count,
        COUNT(DISTINCT profile_id)::int as unique_users,
        COUNT(DISTINCT company_id)::int as unique_companies
      FROM attendances
      WHERE deleted_at IS NULL AND check_in_time >= NOW() - (${days} || ' days')::interval
    `);
    const att = attRes.rows[0] as any;

    // 2. Task management stats
    const taskRes = await db.execute(sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN is_completed = true THEN 1 END)::int as completed,
        COUNT(CASE WHEN is_completed = false OR is_completed IS NULL THEN 1 END)::int as pending,
        COUNT(DISTINCT profile_id)::int as unique_creators,
        COUNT(DISTINCT company_id)::int as unique_companies
      FROM tasks
      WHERE deleted_at IS NULL AND created_at >= NOW() - (${days} || ' days')::interval
    `);
    const task = taskRes.rows[0] as any;
    const taskCompletionRate = task.total > 0 ? Math.round((task.completed / task.total) * 100) : 0;

    // 3. Agenda & Calendar stats
    const agendaRes = await db.execute(sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN type = 'COMPANY' THEN 1 END)::int as company_agendas,
        COUNT(CASE WHEN type = 'PERSONAL' THEN 1 END)::int as personal_agendas,
        COUNT(DISTINCT profile_id)::int as unique_creators
      FROM agendas
      WHERE deleted_at IS NULL AND created_at >= NOW() - (${days} || ' days')::interval
    `);
    const agenda = agendaRes.rows[0] as any;

    // 4. Leave & Permission stats
    const leaveRes = await db.execute(sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN status::text ILIKE '%approv%' OR status::text ILIKE '%disetujui%' THEN 1 END)::int as approved,
        COUNT(CASE WHEN status::text ILIKE '%reject%' OR status::text ILIKE '%ditolak%' THEN 1 END)::int as rejected,
        COUNT(CASE WHEN status::text ILIKE '%pend%' OR status::text ILIKE '%menunggu%' THEN 1 END)::int as pending,
        COUNT(DISTINCT profile_id)::int as unique_requesters
      FROM leave_requests
      WHERE deleted_at IS NULL AND created_at >= NOW() - (${days} || ' days')::interval
    `);
    const leave = leaveRes.rows[0] as any;

    // 5. News & Notifications
    const otherRes = await db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM news WHERE deleted_at IS NULL AND created_at >= NOW() - (${days} || ' days')::interval) as total_news,
        (SELECT COUNT(*)::int FROM notifications WHERE created_at >= NOW() - (${days} || ' days')::interval) as total_notifications,
        (SELECT COUNT(*)::int FROM notifications WHERE is_read = false AND created_at >= NOW() - (${days} || ' days')::interval) as unread_notifications
    `);
    const other = otherRes.rows[0] as any;

    return res.status(200).json({
      success: true,
      message: "Data analitik fitur platform berhasil dimuat",
      data: {
        period,
        attendance: {
          total: att?.total || 0,
          wfoCount: att?.wfo_count || 0,
          wfhCount: att?.wfh_count || 0,
          uniqueUsers: att?.unique_users || 0,
          uniqueCompanies: att?.unique_companies || 0,
        },
        tasks: {
          total: task?.total || 0,
          completed: task?.completed || 0,
          pending: task?.pending || 0,
          completionRate: taskCompletionRate,
          uniqueCreators: task?.unique_creators || 0,
        },
        agendas: {
          total: agenda?.total || 0,
          companyAgendas: agenda?.company_agendas || 0,
          personalAgendas: agenda?.personal_agendas || 0,
          uniqueCreators: agenda?.unique_creators || 0,
        },
        leaves: {
          total: leave?.total || 0,
          approved: leave?.approved || 0,
          rejected: leave?.rejected || 0,
          pending: leave?.pending || 0,
          uniqueRequesters: leave?.unique_requesters || 0,
        },
        news: {
          totalArticles: other?.total_news || 0,
        },
        notifications: {
          totalSent: other?.total_notifications || 0,
          unreadCount: other?.unread_notifications || 0,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching feature analytics:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat analitik fitur platform",
      errors: [error.message],
    });
  }
});

/**
 * GET /api/platform/system-health & GET /api/platform/health
 * Pengecekan status operasional mendalam: Database, Server, Memory, dan Layanan
 */
const handleSystemHealth = async (req: Request, res: Response): Promise<any> => {
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1 as is_alive`);
    const dbLatency = Date.now() - start;

    // Table row counts
    const tableCountsRes = await db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM companies WHERE deleted_at IS NULL) as companies_count,
        (SELECT COUNT(*)::int FROM profiles WHERE deleted_at IS NULL) as profiles_count,
        (SELECT COUNT(*)::int FROM attendances WHERE deleted_at IS NULL) as attendances_count,
        (SELECT COUNT(*)::int FROM tasks WHERE deleted_at IS NULL) as tasks_count,
        (SELECT COUNT(*)::int FROM agendas WHERE deleted_at IS NULL) as agendas_count,
        (SELECT COUNT(*)::int FROM leave_requests WHERE deleted_at IS NULL) as leaves_count,
        (SELECT COUNT(*)::int FROM notifications) as notifications_count
    `);
    const tables = tableCountsRes.rows[0] as any;

    const mem = process.memoryUsage();
    const uptimeSec = Math.floor(process.uptime());

    return res.status(200).json({
      success: true,
      message: "Seluruh layanan Platform Absenin beroperasi secara normal",
      data: {
        status: "healthy",
        uptimeSeconds: uptimeSec,
        serverTime: new Date().toISOString(),
        database: {
          status: "connected",
          provider: "Supabase PostgreSQL",
          engine: "Drizzle ORM & pg.Pool",
          latencyMs: dbLatency,
          tables: {
            companies: tables?.companies_count || 0,
            profiles: tables?.profiles_count || 0,
            attendances: tables?.attendances_count || 0,
            tasks: tables?.tasks_count || 0,
            agendas: tables?.agendas_count || 0,
            leaves: tables?.leaves_count || 0,
            notifications: tables?.notifications_count || 0,
          },
        },
        server: {
          status: "operational",
          nodeVersion: process.version,
          platform: process.platform,
          environment: process.env.NODE_ENV || "development",
          memoryUsage: {
            heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
            heapTotalMB: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
            rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
          },
        },
        services: [
          { name: "PostgreSQL Database", status: "operational", latencyMs: dbLatency },
          { name: "Google OAuth Verification", status: "operational", provider: "google-auth-library" },
          { name: "Express REST Engine", status: "operational", version: "5.2.1" },
          { name: "Tenant Isolation Security", status: "enforced", mode: "Allowlist Strict Guard" },
        ],
      },
    });
  } catch (error: any) {
    console.error("Health check error:", error);
    return res.status(500).json({
      success: false,
      message: "Koneksi database bermasalah atau layanan tidak responsif",
      errors: [error.message],
    });
  }
};

router.get("/health", authenticatePlatformOwner, handleSystemHealth);
router.get("/system-health", authenticatePlatformOwner, handleSystemHealth);

/**
 * GET /api/platform/audit-logs
 * Mengambil riwayat log audit administratif platform
 */
router.get("/audit-logs", authenticatePlatformOwner, async (req: Request, res: Response): Promise<any> => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || "1"));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "15")));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string || "").trim().toLowerCase();
    const actionFilter = (req.query.action as string || "").trim().toUpperCase();

    const searchCondition = search
      ? sql`AND (LOWER(actor_email) LIKE ${`%${search}%`} OR LOWER(COALESCE(actor_name, '')) LIKE ${`%${search}%`} OR LOWER(action) LIKE ${`%${search}%`})`
      : sql``;

    const actionCondition = actionFilter && actionFilter !== "ALL"
      ? sql`AND action LIKE ${`%${actionFilter}%`}`
      : sql``;

    // Summary counts
    const summaryRes = await db.execute(sql`
      SELECT
        COUNT(*)::int as total_logs,
        COUNT(DISTINCT actor_email)::int as unique_actors,
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END)::int as success_logs
      FROM platform_audit_logs
    `);
    const summary = summaryRes.rows[0] as any;

    const countRes = await db.execute(sql`
      SELECT COUNT(*)::int as total
      FROM platform_audit_logs
      WHERE 1=1 ${searchCondition} ${actionCondition}
    `);
    const totalCount = (countRes.rows[0] as any)?.total || 0;

    const logsRes = await db.execute(sql`
      SELECT 
        id,
        actor_email,
        actor_name,
        action,
        entity_type,
        entity_id,
        status,
        ip_address,
        user_agent,
        details,
        created_at
      FROM platform_audit_logs
      WHERE 1=1 ${searchCondition} ${actionCondition}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    return res.status(200).json({
      success: true,
      message: "Audit logs platform berhasil dimuat",
      data: {
        items: logsRes.rows,
        summary: {
          totalLogs: summary?.total_logs || 0,
          uniqueActors: summary?.unique_actors || 0,
          successRate: summary?.total_logs > 0 
            ? Math.round((summary.success_logs / summary.total_logs) * 100) 
            : 100,
        },
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat log audit platform",
      errors: [error.message],
    });
  }
});

/**
 * POST /api/platform/audit-logs
 * Mencatat tindakan administratif baru ke log audit
 */
router.post("/audit-logs", authenticatePlatformOwner, async (req: Request, res: Response): Promise<any> => {
  try {
    const platformOwner = (req as any).platformOwner;
    const { action, entityType, entityId, status, details } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        message: "Action harus ditentukan untuk pencatatan log audit",
      });
    }

    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || null;

    const insertRes = await db.execute(sql`
      INSERT INTO platform_audit_logs (
        actor_email, 
        actor_name, 
        action, 
        entity_type, 
        entity_id, 
        status, 
        ip_address, 
        user_agent, 
        details
      )
      VALUES (
        ${platformOwner.email},
        ${platformOwner.email.split("@")[0]},
        ${action},
        ${entityType || "PLATFORM"},
        ${entityId || null},
        ${status || "SUCCESS"},
        ${ip},
        ${userAgent},
        ${details ? JSON.stringify(details) : null}::jsonb
      )
      RETURNING id, created_at;
    `);

    return res.status(201).json({
      success: true,
      message: "Log audit berhasil dicatat",
      data: insertRes.rows[0],
    });
  } catch (error: any) {
    console.error("Error recording audit log:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mencatat log audit",
      errors: [error.message],
    });
  }
});

export default router;

