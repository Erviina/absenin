import { Router, Request, Response } from "express";
import { db } from "../db";
import { attendances, profiles, companies } from "../db/schema";
import { eq, and, sql, isNull, desc } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import multer from "multer";
import { calculateHaversineDistance } from "../utils/haversine";
import { uploadAttendancePhoto } from "../utils/storage";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

interface AuthRequest extends Request {
  user?: any;
}

router.post("/check-in", authenticate, upload.single("photo"), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;

    // 1. Get profile and company
    const profile = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
    if (!profile.length) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    const companyId = profile[0].company_id;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "User does not belong to any company" });
    }

    const { work_mode, latitude, longitude, address } = req.body;
    const file = req.file;

    // 2. Validate request
    if (!work_mode || (work_mode !== "WFO" && work_mode !== "WFH")) {
      return res.status(400).json({ success: false, message: "Invalid work_mode. Must be WFO or WFH." });
    }
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: "Latitude and longitude are required." });
    }
    if (!address) {
      return res.status(400).json({ success: false, message: "Address is required." });
    }
    if (!file) {
      return res.status(400).json({ success: false, message: "Photo is required." });
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
      return res.status(400).json({ success: false, message: "Invalid coordinates." });
    }

    // 3. Validate WFO (GEOFENCING DISABLED/PENDING)
    /*
    if (work_mode === "WFO") {
      const company = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
      if (!company.length || !company[0].latitude || !company[0].longitude) {
        return res.status(400).json({ success: false, message: "Company location is not configured." });
      }

      const compLat = parseFloat(company[0].latitude as any);
      const compLon = parseFloat(company[0].longitude as any);

      const distance = calculateHaversineDistance(latNum, lonNum, compLat, compLon);
      
      if (distance > 100) {
        return res.status(400).json({ success: false, message: "You are outside the 100m radius of the office." });
      }
    }
    */

    // 4. Check for active attendance today
    const activeAttendance = await db
      .select()
      .from(attendances)
      .where(
        and(
          eq(attendances.profile_id, userId),
          isNull(attendances.check_out_time),
          isNull(attendances.deleted_at),
          sql`DATE(check_in_time AT TIME ZONE 'Asia/Jakarta') = DATE(now() AT TIME ZONE 'Asia/Jakarta')`
        )
      )
      .limit(1);

    if (activeAttendance.length > 0) {
      return res.status(400).json({ success: false, message: "You already have an active check-in today." });
    }

    // 5. Upload photo
    let photoUrl;
    try {
      photoUrl = await uploadAttendancePhoto(file.buffer, file.mimetype, companyId, userId);
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }

    // 6. Insert attendance
    const newAttendance = await db.insert(attendances).values({
      profile_id: userId,
      company_id: companyId,
      work_mode: work_mode as "WFO" | "WFH",
      check_in_time: sql`now()`,
      check_in_latitude: latNum.toString(),
      check_in_longitude: lonNum.toString(),
      check_in_address: address,
      check_in_photo_url: photoUrl,
      created_by: userId,
      updated_by: userId
    }).returning({
      id: attendances.id,
      work_mode: attendances.work_mode,
      check_in_time: attendances.check_in_time,
      check_in_latitude: attendances.check_in_latitude,
      check_in_longitude: attendances.check_in_longitude,
      check_in_address: attendances.check_in_address,
      check_in_photo_url: attendances.check_in_photo_url
    });

    return res.status(201).json({
      success: true,
      message: "Check-in successful",
      data: newAttendance[0]
    });

  } catch (error: any) {
    console.error("Check-in error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

router.post("/check-out", authenticate, upload.single("photo"), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;

    // 1. Get profile and company
    const profile = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
    if (!profile.length) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    const companyId = profile[0].company_id;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "User does not belong to any company" });
    }

    // 2. Look for active attendance today
    const activeAttendanceList = await db
      .select()
      .from(attendances)
      .where(
        and(
          eq(attendances.profile_id, userId),
          isNull(attendances.deleted_at),
          sql`DATE(check_in_time AT TIME ZONE 'Asia/Jakarta') = DATE(now() AT TIME ZONE 'Asia/Jakarta')`
        )
      )
      .limit(1);

    if (activeAttendanceList.length === 0) {
      return res.status(400).json({ success: false, message: "Tidak ada check-in aktif untuk hari ini." });
    }

    const activeAttendance = activeAttendanceList[0];

    if (activeAttendance.check_out_time) {
      return res.status(400).json({ success: false, message: "Anda sudah melakukan check-out hari ini." });
    }

    const { latitude, longitude, address } = req.body;
    const file = req.file;

    // 3. Validate request
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: "Latitude and longitude are required." });
    }
    if (!address) {
      return res.status(400).json({ success: false, message: "Address is required." });
    }
    if (!file) {
      return res.status(400).json({ success: false, message: "Photo is required." });
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
      return res.status(400).json({ success: false, message: "Invalid coordinates." });
    }

    // 4. Upload photo
    let photoUrl;
    try {
      photoUrl = await uploadAttendancePhoto(file.buffer, file.mimetype, companyId, userId);
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }

    // 5. Update attendance
    const updatedAttendance = await db.update(attendances)
      .set({
        check_out_time: sql`now()`,
        check_out_latitude: latNum.toString(),
        check_out_longitude: lonNum.toString(),
        check_out_address: address,
        check_out_photo_url: photoUrl,
        updated_at: sql`now()`,
        updated_by: userId
      })
      .where(eq(attendances.id, activeAttendance.id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Check-out successful",
      data: updatedAttendance[0]
    });

  } catch (error: any) {
    console.error("Check-out error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

router.get("/today", authenticate, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;

    const todayAttendance = await db
      .select()
      .from(attendances)
      .where(
        and(
          eq(attendances.profile_id, userId),
          isNull(attendances.deleted_at),
          sql`DATE(check_in_time AT TIME ZONE 'Asia/Jakarta') = DATE(now() AT TIME ZONE 'Asia/Jakarta')`
        )
      )
      .limit(1);

    if (todayAttendance.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          status: "NOT_CHECKED_IN",
          attendance: null
        }
      });
    }

    const attendance = todayAttendance[0];

    if (attendance.check_out_time) {
      return res.status(200).json({
        success: true,
        data: {
          status: "CHECKED_OUT",
          attendance
        }
      });
    } else {
      return res.status(200).json({
        success: true,
        data: {
          status: "CHECKED_IN",
          attendance
        }
      });
    }

  } catch (error: any) {
    console.error("Get today attendance error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

router.get("/", authenticate, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;

    const conditions = [
      eq(attendances.profile_id, userId),
      isNull(attendances.deleted_at)
    ];

    if (start_date && typeof start_date === 'string') {
      conditions.push(sql`DATE(check_in_time AT TIME ZONE 'Asia/Jakarta') >= ${start_date}`);
    }
    
    if (end_date && typeof end_date === 'string') {
      conditions.push(sql`DATE(check_in_time AT TIME ZONE 'Asia/Jakarta') <= ${end_date}`);
    }

    const history = await db
      .select({
        id: attendances.id,
        work_mode: attendances.work_mode,
        check_in_time: attendances.check_in_time,
        check_in_latitude: attendances.check_in_latitude,
        check_in_longitude: attendances.check_in_longitude,
        check_in_address: attendances.check_in_address,
        check_in_photo_url: attendances.check_in_photo_url,
        check_out_time: attendances.check_out_time,
        check_out_latitude: attendances.check_out_latitude,
        check_out_longitude: attendances.check_out_longitude,
        check_out_address: attendances.check_out_address,
        check_out_photo_url: attendances.check_out_photo_url
      })
      .from(attendances)
      .where(and(...conditions))
      .orderBy(desc(attendances.check_in_time));

    return res.status(200).json({
      success: true,
      data: history
    });

  } catch (error: any) {
    console.error("Get attendances error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

router.get("/:id", authenticate, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const id = req.params.id as string;

    const detail = await db
      .select({
        id: attendances.id,
        work_mode: attendances.work_mode,
        check_in_time: attendances.check_in_time,
        check_in_latitude: attendances.check_in_latitude,
        check_in_longitude: attendances.check_in_longitude,
        check_in_address: attendances.check_in_address,
        check_in_photo_url: attendances.check_in_photo_url,
        check_out_time: attendances.check_out_time,
        check_out_latitude: attendances.check_out_latitude,
        check_out_longitude: attendances.check_out_longitude,
        check_out_address: attendances.check_out_address,
        check_out_photo_url: attendances.check_out_photo_url,
        created_at: attendances.created_at,
        updated_at: attendances.updated_at
      })
      .from(attendances)
      .where(
        and(
          eq(attendances.id, id as string),
          eq(attendances.profile_id, userId),
          isNull(attendances.deleted_at)
        )
      )
      .limit(1);

    if (detail.length === 0) {
      return res.status(404).json({ success: false, message: "Attendance not found" });
    }

    return res.status(200).json({
      success: true,
      data: detail[0]
    });

  } catch (error: any) {
    console.error("Get attendance detail error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

router.get("/management/summary", authenticate, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: "Month and year are required." });
    }

    // 1. Get Admin/Manager's company_id
    const profileRes = await db.execute(sql`
      SELECT company_id FROM profiles WHERE id = ${userId}
    `);
    
    if (profileRes.rows.length === 0 || !profileRes.rows[0].company_id) {
      return res.status(404).json({ success: false, message: "Anda tidak terhubung ke perusahaan manapun" });
    }
    const companyId = profileRes.rows[0].company_id as string;

    // 2. Verify if user is an Admin or Manager
    const roleRes = await db.execute(sql`
      SELECT role FROM profile_roles WHERE profile_id = ${userId} AND role IN ('Admin', 'Manager')
    `);
    if (roleRes.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Forbidden: Hanya Admin atau Manager yang dapat mengakses laporan" });
    }

    // 3. Get all profiles in the company
    const employeesRes = await db.execute(sql`
      SELECT id, full_name
      FROM profiles
      WHERE company_id = ${companyId}
    `);

    // 4. Get roles for these profiles
    const rolesRes = await db.execute(sql`
      SELECT pr.profile_id, pr.role
      FROM profile_roles pr
      JOIN profiles p ON p.id = pr.profile_id
      WHERE p.company_id = ${companyId}
    `);
    
    const rolesMap: Record<string, string> = {};
    for (const row of rolesRes.rows) {
      const pid = row.profile_id as string;
      const role = row.role as string;
      // Prioritize Admin > Manager > Employee
      if (role === 'Admin') rolesMap[pid] = 'Admin';
      else if (role === 'Manager' && rolesMap[pid] !== 'Admin') rolesMap[pid] = 'Manager';
      else if (!rolesMap[pid]) rolesMap[pid] = 'Employee';
    }

    // 5. Get attendances for the given month and year
    // using timezone Asia/Jakarta
    const monthNum = parseInt(month as string);
    const yearNum = parseInt(year as string);
    
    const attendancesRes = await db.execute(sql`
      SELECT 
        a.profile_id,
        sum(CASE WHEN 
          (c.work_days IS NULL OR c.work_days = '{}' OR (
            CASE EXTRACT(ISODOW FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(c.work_days))
        THEN 1 ELSE 0 END) as hadir_count,
        sum(CASE WHEN c.work_start_time IS NOT NULL AND (a.check_in_time AT TIME ZONE 'Asia/Jakarta')::time > c.work_start_time 
          AND (c.work_days IS NULL OR c.work_days = '{}' OR (
            CASE EXTRACT(ISODOW FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(c.work_days))
        THEN 1 ELSE 0 END) as terlambat_count
      FROM attendances a
      JOIN companies c ON a.company_id = c.id
      WHERE a.company_id = ${companyId}
        AND a.deleted_at IS NULL
        AND EXTRACT(MONTH FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta') = ${monthNum}
        AND EXTRACT(YEAR FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta') = ${yearNum}
      GROUP BY a.profile_id
    `);

    const attendanceMap: Record<string, { hadir: number, terlambat: number }> = {};
    for (const row of attendancesRes.rows) {
      attendanceMap[row.profile_id as string] = {
        hadir: parseInt(row.hadir_count as string) || 0,
        terlambat: parseInt(row.terlambat_count as string) || 0
      };
    }

    // 6. Get leave requests for the given month and year
    const leavesRes = await db.execute(sql`
      SELECT 
        profile_id,
        count(id) as izin_count
      FROM leave_requests
      WHERE company_id = ${companyId}
        AND status = 'Disetujui'
        AND deleted_at IS NULL
        AND (
          (EXTRACT(MONTH FROM start_date) = ${monthNum} AND EXTRACT(YEAR FROM start_date) = ${yearNum})
          OR 
          (EXTRACT(MONTH FROM end_date) = ${monthNum} AND EXTRACT(YEAR FROM end_date) = ${yearNum})
        )
      GROUP BY profile_id
    `);

    const leaveMap: Record<string, number> = {};
    for (const row of leavesRes.rows) {
      leaveMap[row.profile_id as string] = parseInt(row.izin_count as string) || 0;
    }

    // 7. Build the summary
    const summary = employeesRes.rows.map((emp) => {
      const empId = emp.id as string;
      const attStats = attendanceMap[empId] || { hadir: 0, terlambat: 0 };
      const hadir = attStats.hadir;
      const terlambat = attStats.terlambat;
      const izin = leaveMap[empId] || 0; 
      const role = rolesMap[empId] || 'Employee';
      const roleDisplay = role === 'Admin' ? 'Admin' : (role === 'Manager' ? 'Manajemen' : 'Karyawan');
      
      return {
        id: empId,
        name: emp.full_name || "Tanpa Nama",
        role: roleDisplay,
        hadir,
        izin,
        terlambat,
        total: hadir + izin
      };
    });

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    console.error("Get management summary error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

router.get("/management/employees/:employeeId", authenticate, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const { employeeId } = req.params;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: "Month and year are required." });
    }

    // 1. Get Admin/Manager's company_id
    const profileRes = await db.execute(sql`
      SELECT company_id FROM profiles WHERE id = ${userId}
    `);
    
    if (profileRes.rows.length === 0 || !profileRes.rows[0].company_id) {
      return res.status(404).json({ success: false, message: "Anda tidak terhubung ke perusahaan manapun" });
    }
    const companyId = profileRes.rows[0].company_id as string;

    // 2. Verify if user is an Admin or Manager
    const roleRes = await db.execute(sql`
      SELECT role FROM profile_roles WHERE profile_id = ${userId} AND role IN ('Admin', 'Manager')
    `);
    if (roleRes.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Forbidden: Hanya Admin atau Manager yang dapat mengakses." });
    }

    // 3. Get Employee info & Verify company
    const employeeRes = await db.execute(sql`
      SELECT p.id, p.full_name, p.email, p.avatar_url, pr.role
      FROM profiles p
      LEFT JOIN profile_roles pr ON pr.profile_id = p.id
      WHERE p.id = ${employeeId} AND p.company_id = ${companyId}
    `);

    if (employeeRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Karyawan tidak ditemukan di perusahaan ini." });
    }

    const employee = employeeRes.rows[0];

    // 4. Calculate Summary for the month/year
    const monthNum = parseInt(month as string);
    const yearNum = parseInt(year as string);

    const attendancesRes = await db.execute(sql`
      SELECT 
        a.id, a.work_mode, a.check_in_time, a.check_in_latitude, a.check_in_longitude, 
        a.check_in_address, a.check_in_photo_url, a.check_out_time, a.check_out_latitude, 
        a.check_out_longitude, a.check_out_address, a.check_out_photo_url,
        (CASE WHEN c.work_start_time IS NOT NULL AND (a.check_in_time AT TIME ZONE 'Asia/Jakarta')::time > c.work_start_time 
          AND (c.work_days IS NULL OR c.work_days = '{}' OR (
            CASE EXTRACT(ISODOW FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(c.work_days))
        THEN 1 ELSE 0 END) as is_terlambat
      FROM attendances a
      JOIN companies c ON a.company_id = c.id
      WHERE a.company_id = ${companyId}
        AND a.profile_id = ${employeeId}
        AND a.deleted_at IS NULL
        AND EXTRACT(MONTH FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta') = ${monthNum}
        AND EXTRACT(YEAR FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta') = ${yearNum}
      ORDER BY a.check_in_time DESC
    `);

    let hadir = 0;
    let terlambat = 0;
    
    const attendancesList = attendancesRes.rows.map(row => {
      hadir++;
      if (parseInt(row.is_terlambat as string) === 1) {
        terlambat++;
      }
      return {
        id: row.id,
        work_mode: row.work_mode,
        check_in_time: row.check_in_time,
        check_in_latitude: row.check_in_latitude,
        check_in_longitude: row.check_in_longitude,
        check_in_address: row.check_in_address,
        check_in_photo_url: row.check_in_photo_url,
        check_out_time: row.check_out_time,
        check_out_latitude: row.check_out_latitude,
        check_out_longitude: row.check_out_longitude,
        check_out_address: row.check_out_address,
        check_out_photo_url: row.check_out_photo_url,
      };
    });

    const leavesRes = await db.execute(sql`
      SELECT count(id) as izin_count
      FROM leave_requests
      WHERE company_id = ${companyId}
        AND profile_id = ${employeeId}
        AND status = 'Disetujui'
        AND deleted_at IS NULL
        AND (
          (EXTRACT(MONTH FROM start_date) = ${monthNum} AND EXTRACT(YEAR FROM start_date) = ${yearNum})
          OR 
          (EXTRACT(MONTH FROM end_date) = ${monthNum} AND EXTRACT(YEAR FROM end_date) = ${yearNum})
        )
    `);

    const izin = parseInt(leavesRes.rows[0].izin_count as string) || 0;

    return res.status(200).json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          full_name: employee.full_name || "Tanpa Nama",
          email: employee.email || "",
          avatar_url: employee.avatar_url || null,
          role: employee.role || "Employee"
        },
        summary: {
          hadir,
          izin,
          terlambat,
          total: hadir + izin
        },
        attendances: attendancesList
      }
    });

  } catch (error: any) {
    console.error("Get management employee detail error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

export default router;
