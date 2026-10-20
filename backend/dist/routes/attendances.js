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
const multer_1 = __importDefault(require("multer"));
const storage_1 = require("../utils/storage");
const tenant_1 = require("../utils/tenant");
const pagination_1 = require("../utils/pagination");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.post("/check-in", auth_1.authenticate, upload.single("photo"), async (req, res) => {
    try {
        const userId = req.user.id;
        // 1. Get profile and company via resolveTenant
        const tenant = await (0, tenant_1.resolveTenant)(req, userId);
        if (!tenant) {
            return res.status(400).json({ success: false, message: "User does not belong to any active company or tenant" });
        }
        const companyId = tenant.companyId;
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
        // 3. Fetch company configuration and validate work_days & work_start_time (15 menit sebelum masuk)
        const compRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT id, 
             COALESCE(work_start_time, '08:00:00'::time) as work_start_time, 
             COALESCE(NULLIF(work_days, '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]) as work_days,
             (now() AT TIME ZONE 'Asia/Jakarta')::time as current_time_wib,
             EXTRACT(ISODOW FROM now() AT TIME ZONE 'Asia/Jakarta') as current_isodow
      FROM companies
      WHERE id = ${companyId} AND deleted_at IS NULL
      LIMIT 1
    `);
        if (compRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan." });
        }
        const compRow = compRes.rows[0];
        const isodow = parseInt(compRow.current_isodow, 10);
        const dayNames = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
        const currentDayName = dayNames[isodow - 1];
        // Validasi work_days
        const workDays = compRow.work_days || ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
        if (workDays && Array.isArray(workDays) && workDays.length > 0) {
            if (!workDays.includes(currentDayName)) {
                return res.status(400).json({
                    success: false,
                    message: `Hari ini (${currentDayName}) bukan hari kerja perusahaan.`
                });
            }
        }
        // Validasi work_start_time (Check-in hanya dibuka 15 menit sebelum work_start_time, default standar 08:00)
        const rawStartTime = compRow.work_start_time || "08:00";
        const [startHour, startMin] = String(rawStartTime).split(":").map(Number);
        const startTotalMinutes = (isNaN(startHour) ? 8 : startHour) * 60 + (isNaN(startMin) ? 0 : startMin);
        const openTotalMinutes = Math.max(0, startTotalMinutes - 15);
        const currentTimeStr = String(compRow.current_time_wib);
        const [curHour, curMin] = currentTimeStr.split(":").map(Number);
        const curTotalMinutes = (isNaN(curHour) ? 0 : curHour) * 60 + (isNaN(curMin) ? 0 : curMin);
        if (curTotalMinutes < openTotalMinutes) {
            const openHour = Math.floor(openTotalMinutes / 60);
            const openMinute = openTotalMinutes % 60;
            const openTimeFormatted = `${String(openHour).padStart(2, '0')}:${String(openMinute).padStart(2, '0')}`;
            return res.status(400).json({
                success: false,
                message: `Check-in belum dibuka. Check-in hanya dapat dilakukan mulai 15 menit sebelum jam masuk (pukul ${openTimeFormatted} WIB).`
            });
        }
        // 4. Check for existing attendance today in this company (mencegah check-in ganda baik yang masih aktif maupun yang sudah checkout)
        const existingAttendance = await db_1.db
            .select()
            .from(schema_1.attendances)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendances.profile_id, userId), (0, drizzle_orm_1.eq)(schema_1.attendances.company_id, companyId), (0, drizzle_orm_1.isNull)(schema_1.attendances.deleted_at), (0, drizzle_orm_1.sql) `DATE(check_in_time AT TIME ZONE 'Asia/Jakarta') = DATE(now() AT TIME ZONE 'Asia/Jakarta')`))
            .limit(1);
        if (existingAttendance.length > 0) {
            if (existingAttendance[0].check_out_time) {
                return res.status(400).json({ success: false, message: "Anda sudah menyelesaikan absensi (check-in dan check-out) untuk hari ini." });
            }
            return res.status(400).json({ success: false, message: "Anda sudah melakukan check-in hari ini." });
        }
        // 5. Upload photo
        let photoUrl;
        try {
            photoUrl = await (0, storage_1.uploadAttendancePhoto)(file.buffer, file.mimetype, companyId, userId);
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        // 6. Insert attendance
        const newAttendance = await db_1.db.insert(schema_1.attendances).values({
            profile_id: userId,
            company_id: companyId,
            work_mode: work_mode,
            check_in_time: (0, drizzle_orm_1.sql) `now()`,
            check_in_latitude: latNum.toString(),
            check_in_longitude: lonNum.toString(),
            check_in_address: address,
            check_in_photo_url: photoUrl,
            created_by: userId,
            updated_by: userId
        }).returning({
            id: schema_1.attendances.id,
            work_mode: schema_1.attendances.work_mode,
            check_in_time: schema_1.attendances.check_in_time,
            check_in_latitude: schema_1.attendances.check_in_latitude,
            check_in_longitude: schema_1.attendances.check_in_longitude,
            check_in_address: schema_1.attendances.check_in_address,
            check_in_photo_url: schema_1.attendances.check_in_photo_url
        });
        return res.status(201).json({
            success: true,
            message: "Check-in successful",
            data: newAttendance[0]
        });
    }
    catch (error) {
        console.error("Check-in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
});
router.post("/check-out", auth_1.authenticate, upload.single("photo"), async (req, res) => {
    try {
        const userId = req.user.id;
        // 1. Get profile and company via resolveTenant
        const tenant = await (0, tenant_1.resolveTenant)(req, userId);
        if (!tenant) {
            return res.status(400).json({ success: false, message: "User does not belong to any active company or tenant" });
        }
        const companyId = tenant.companyId;
        // 2. Look for active attendance today
        const activeAttendanceList = await db_1.db
            .select()
            .from(schema_1.attendances)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendances.profile_id, userId), (0, drizzle_orm_1.eq)(schema_1.attendances.company_id, companyId), (0, drizzle_orm_1.isNull)(schema_1.attendances.deleted_at), (0, drizzle_orm_1.sql) `DATE(check_in_time AT TIME ZONE 'Asia/Jakarta') = DATE(now() AT TIME ZONE 'Asia/Jakarta')`))
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
            photoUrl = await (0, storage_1.uploadAttendancePhoto)(file.buffer, file.mimetype, companyId, userId);
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        // 5. Update attendance
        const updatedAttendance = await db_1.db.update(schema_1.attendances)
            .set({
            check_out_time: (0, drizzle_orm_1.sql) `now()`,
            check_out_latitude: latNum.toString(),
            check_out_longitude: lonNum.toString(),
            check_out_address: address,
            check_out_photo_url: photoUrl,
            updated_at: (0, drizzle_orm_1.sql) `now()`,
            updated_by: userId
        })
            .where((0, drizzle_orm_1.eq)(schema_1.attendances.id, activeAttendance.id))
            .returning();
        return res.status(200).json({
            success: true,
            message: "Check-out successful",
            data: updatedAttendance[0]
        });
    }
    catch (error) {
        console.error("Check-out error:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
});
router.get("/today", auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const tenant = await (0, tenant_1.resolveTenant)(req, userId);
        const conditions = [
            (0, drizzle_orm_1.eq)(schema_1.attendances.profile_id, userId),
            (0, drizzle_orm_1.isNull)(schema_1.attendances.deleted_at),
            (0, drizzle_orm_1.sql) `DATE(check_in_time AT TIME ZONE 'Asia/Jakarta') = DATE(now() AT TIME ZONE 'Asia/Jakarta')`
        ];
        if (tenant) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.attendances.company_id, tenant.companyId));
        }
        const todayAttendance = await db_1.db
            .select()
            .from(schema_1.attendances)
            .where((0, drizzle_orm_1.and)(...conditions))
            .limit(1);
        let companyData = null;
        if (tenant?.companyId) {
            const compRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT id, name, 
               COALESCE(work_start_time, '08:00:00'::time) as work_start_time, 
               COALESCE(work_end_time, '17:00:00'::time) as work_end_time, 
               COALESCE(NULLIF(work_days, '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]) as work_days,
               to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS"+07:00"') as server_time,
               to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') as server_date,
               to_char(now() AT TIME ZONE 'Asia/Jakarta', 'HH24:MI') as server_clock,
               EXTRACT(ISODOW FROM now() AT TIME ZONE 'Asia/Jakarta') as current_isodow
        FROM companies
        WHERE id = ${tenant.companyId} AND deleted_at IS NULL
        LIMIT 1
      `);
            if (compRes.rows.length > 0) {
                companyData = compRes.rows[0];
            }
        }
        if (todayAttendance.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    status: "NOT_CHECKED_IN",
                    attendance: null,
                    company: companyData
                }
            });
        }
        const attendance = todayAttendance[0];
        if (attendance.check_out_time) {
            return res.status(200).json({
                success: true,
                data: {
                    status: "CHECKED_OUT",
                    attendance,
                    company: companyData
                }
            });
        }
        else {
            return res.status(200).json({
                success: true,
                data: {
                    status: "CHECKED_IN",
                    attendance,
                    company: companyData
                }
            });
        }
    }
    catch (error) {
        console.error("Get today attendance error:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
});
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const tenant = await (0, tenant_1.resolveTenant)(req, userId);
        const { start_date, end_date, search } = req.query;
        const { limit, offset } = (0, pagination_1.parsePaginationParams)(req.query, 10, 100);
        let dateConditions = (0, drizzle_orm_1.sql) ``;
        if (start_date && typeof start_date === 'string') {
            dateConditions = (0, drizzle_orm_1.sql) `${dateConditions} AND DATE(a.check_in_time AT TIME ZONE 'Asia/Jakarta') >= ${start_date}::date`;
        }
        if (end_date && typeof end_date === 'string') {
            dateConditions = (0, drizzle_orm_1.sql) `${dateConditions} AND DATE(a.check_in_time AT TIME ZONE 'Asia/Jakarta') <= ${end_date}::date`;
        }
        let tenantCondition = (0, drizzle_orm_1.sql) ``;
        if (tenant?.companyId) {
            tenantCondition = (0, drizzle_orm_1.sql) `AND a.company_id = ${tenant.companyId}`;
        }
        let searchCondition = (0, drizzle_orm_1.sql) ``;
        if (search && typeof search === 'string' && search.trim() !== '') {
            const s = `%${search.trim().toLowerCase()}%`;
            searchCondition = (0, drizzle_orm_1.sql) `AND (
        LOWER(a.work_mode) LIKE ${s}
        OR LOWER(COALESCE(a.check_in_address, '')) LIKE ${s}
        OR LOWER(COALESCE(a.check_out_address, '')) LIKE ${s}
      )`;
        }
        const countRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT count(*)::int as total
      FROM attendances a
      WHERE a.profile_id = ${userId}
        AND a.deleted_at IS NULL
        ${tenantCondition}
        ${dateConditions}
        ${searchCondition}
    `);
        const total = Number(countRes.rows[0]?.total || 0);
        const query = (0, drizzle_orm_1.sql) `
      SELECT 
        a.id,
        a.work_mode,
        a.check_in_time,
        a.check_in_latitude,
        a.check_in_longitude,
        a.check_in_address,
        a.check_in_photo_url,
        a.check_out_time,
        a.check_out_latitude,
        a.check_out_longitude,
        a.check_out_address,
        a.check_out_photo_url,
        (CASE WHEN (a.check_in_time AT TIME ZONE 'Asia/Jakarta')::time > COALESCE(c.work_start_time, '08:00:00'::time) 
          AND (
            CASE EXTRACT(ISODOW FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF(c.work_days, '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN true ELSE false END) as is_terlambat,
        (CASE WHEN a.check_out_time IS NOT NULL 
          AND (a.check_out_time AT TIME ZONE 'Asia/Jakarta')::time < COALESCE(c.work_end_time, '17:00:00'::time) 
          AND (
            CASE EXTRACT(ISODOW FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF(c.work_days, '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN true ELSE false END) as is_pulang_cepat
      FROM attendances a
      LEFT JOIN companies c ON a.company_id = c.id
      WHERE a.profile_id = ${userId}
        AND a.deleted_at IS NULL
        ${tenantCondition}
        ${dateConditions}
        ${searchCondition}
      ORDER BY a.check_in_time DESC, a.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
        const historyRes = await db_1.db.execute(query);
        const history = historyRes.rows.map(row => ({
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
            is_terlambat: Boolean(row.is_terlambat),
            is_pulang_cepat: Boolean(row.is_pulang_cepat),
        }));
        const pagination = (0, pagination_1.buildPaginationMeta)(total, limit, offset);
        return res.status(200).json({
            success: true,
            data: history,
            pagination,
            meta: pagination
        });
    }
    catch (error) {
        console.error("Get attendances error:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
});
router.get("/management/summary", auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ success: false, message: "Month and year are required." });
        }
        // 1. Resolve tenant
        const tenant = await (0, tenant_1.resolveTenant)(req, userId);
        if (!tenant) {
            return res.status(404).json({ success: false, message: "Anda tidak terhubung ke perusahaan manapun" });
        }
        if (!tenant.isManagement) {
            return res.status(403).json({ success: false, message: "Forbidden: Hanya Admin atau Manager yang dapat mengakses laporan" });
        }
        const companyId = tenant.companyId;
        const { limit, offset } = (0, pagination_1.parsePaginationParams)(req.query, 10, 100);
        const { search } = req.query;
        let searchCondition = (0, drizzle_orm_1.sql) ``;
        if (search && typeof search === 'string' && search.trim() !== '') {
            const s = `%${search.trim().toLowerCase()}%`;
            searchCondition = (0, drizzle_orm_1.sql) `AND LOWER(p.full_name) LIKE ${s}`;
        }
        // Total active employees matching filter
        const countRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT count(*)::int as total
      FROM company_members cm
      JOIN profiles p ON p.id = cm.profile_id
      WHERE cm.company_id = ${companyId}
        AND cm.status = 'active'
        AND cm.deleted_at IS NULL
        ${searchCondition}
    `);
        const total = Number(countRes.rows[0]?.total || 0);
        // 2. Get active members in the company with LIMIT and OFFSET
        const employeesRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT p.id, p.full_name, cm.role
      FROM company_members cm
      JOIN profiles p ON p.id = cm.profile_id
      WHERE cm.company_id = ${companyId}
        AND cm.status = 'active'
        AND cm.deleted_at IS NULL
        ${searchCondition}
      ORDER BY cm.joined_at ASC, p.id ASC
      LIMIT ${limit} OFFSET ${offset}
    `);
        const rolesMap = {};
        for (const row of employeesRes.rows) {
            const pid = row.id;
            const rawRole = (row.role || "").toLowerCase();
            if (rawRole === 'owner')
                rolesMap[pid] = 'Admin';
            else if (rawRole === 'admin')
                rolesMap[pid] = 'Admin';
            else if (rawRole === 'manager')
                rolesMap[pid] = 'Manager';
            else
                rolesMap[pid] = 'Employee';
        }
        // 5. Get attendances for the given month and year
        // using timezone Asia/Jakarta
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        const attendancesRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT 
        a.profile_id,
        sum(CASE WHEN 
          (
            CASE EXTRACT(ISODOW FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF(c.work_days, '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN 1 ELSE 0 END) as hadir_count,
        sum(CASE WHEN (a.check_in_time AT TIME ZONE 'Asia/Jakarta')::time > COALESCE(c.work_start_time, '08:00:00'::time) 
          AND (
            CASE EXTRACT(ISODOW FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF(c.work_days, '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN 1 ELSE 0 END) as terlambat_count
      FROM attendances a
      JOIN companies c ON a.company_id = c.id
      WHERE a.company_id = ${companyId}
        AND a.deleted_at IS NULL
        AND EXTRACT(MONTH FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta') = ${monthNum}
        AND EXTRACT(YEAR FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta') = ${yearNum}
      GROUP BY a.profile_id
    `);
        const attendanceMap = {};
        for (const row of attendancesRes.rows) {
            attendanceMap[row.profile_id] = {
                hadir: parseInt(row.hadir_count) || 0,
                terlambat: parseInt(row.terlambat_count) || 0
            };
        }
        // 6. Get leave requests for the given month and year
        const leavesRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
        const leaveMap = {};
        for (const row of leavesRes.rows) {
            leaveMap[row.profile_id] = parseInt(row.izin_count) || 0;
        }
        // 7. Build the summary
        const summary = employeesRes.rows.map((emp) => {
            const empId = emp.id;
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
        const pagination = (0, pagination_1.buildPaginationMeta)(total, limit, offset);
        return res.status(200).json({
            success: true,
            data: summary,
            pagination,
            meta: pagination
        });
    }
    catch (error) {
        console.error("Get management summary error:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
});
router.get("/management/employees/:employeeId", auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { employeeId } = req.params;
        const { month, year, startDate, endDate, date } = req.query;
        // 1. Resolve tenant
        const tenant = await (0, tenant_1.resolveTenant)(req, userId);
        if (!tenant) {
            return res.status(404).json({ success: false, message: "Anda tidak terhubung ke perusahaan manapun" });
        }
        if (!tenant.isManagement) {
            return res.status(403).json({ success: false, message: "Forbidden: Hanya Admin atau Manager yang dapat mengakses." });
        }
        const companyId = tenant.companyId;
        // 2. Get Employee info & Verify membership in this company
        const employeeRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT p.id, p.full_name, p.email, p.avatar_url, cm.role, cm.status, cm.joined_at
      FROM company_members cm
      JOIN profiles p ON p.id = cm.profile_id
      WHERE cm.company_id = ${companyId}
        AND cm.profile_id = ${employeeId}
        AND cm.status = 'active'
        AND cm.deleted_at IS NULL
      LIMIT 1
    `);
        if (employeeRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Karyawan tidak ditemukan di perusahaan ini." });
        }
        const employee = employeeRes.rows[0];
        // 3. Dynamic Date Filter
        const now = new Date();
        const monthNum = month ? parseInt(month) : (now.getMonth() + 1);
        const yearNum = year ? parseInt(year) : now.getFullYear();
        let dateCondition = (0, drizzle_orm_1.sql) `
      AND EXTRACT(MONTH FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta') = ${monthNum}
      AND EXTRACT(YEAR FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta') = ${yearNum}
    `;
        if (date) {
            dateCondition = (0, drizzle_orm_1.sql) `AND (a.check_in_time AT TIME ZONE 'Asia/Jakarta')::date = ${date}::date`;
        }
        else if (startDate && endDate) {
            dateCondition = (0, drizzle_orm_1.sql) `
        AND (a.check_in_time AT TIME ZONE 'Asia/Jakarta')::date >= ${startDate}::date
        AND (a.check_in_time AT TIME ZONE 'Asia/Jakarta')::date <= ${endDate}::date
      `;
        }
        else if (startDate) {
            dateCondition = (0, drizzle_orm_1.sql) `AND (a.check_in_time AT TIME ZONE 'Asia/Jakarta')::date >= ${startDate}::date`;
        }
        const attendancesRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT 
        a.id, a.work_mode, a.check_in_time, a.check_in_latitude, a.check_in_longitude, 
        a.check_in_address, a.check_in_photo_url, a.check_out_time, a.check_out_latitude, 
        a.check_out_longitude, a.check_out_address, a.check_out_photo_url,
        (CASE WHEN (a.check_in_time AT TIME ZONE 'Asia/Jakarta')::time > COALESCE(c.work_start_time, '08:00:00'::time) 
          AND (
            CASE EXTRACT(ISODOW FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF(c.work_days, '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN 1 ELSE 0 END) as is_terlambat,
        (CASE WHEN a.check_out_time IS NOT NULL 
          AND (a.check_out_time AT TIME ZONE 'Asia/Jakarta')::time < COALESCE(c.work_end_time, '17:00:00'::time) 
          AND (
            CASE EXTRACT(ISODOW FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF(c.work_days, '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN 1 ELSE 0 END) as is_pulang_cepat
      FROM attendances a
      JOIN companies c ON a.company_id = c.id
      WHERE a.company_id = ${companyId}
        AND a.profile_id = ${employeeId}
        AND a.deleted_at IS NULL
        ${dateCondition}
      ORDER BY a.check_in_time DESC
    `);
        let hadir = 0;
        let terlambat = 0;
        const attendancesList = attendancesRes.rows.map(row => {
            hadir++;
            const isLate = parseInt(row.is_terlambat) === 1;
            const isPulangCepat = parseInt(row.is_pulang_cepat) === 1;
            if (isLate) {
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
                is_terlambat: isLate,
                is_pulang_cepat: isPulangCepat,
            };
        });
        const leavesRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
        const izin = parseInt(leavesRes.rows[0]?.izin_count) || 0;
        return res.status(200).json({
            success: true,
            data: {
                employee: {
                    id: employee.id,
                    full_name: employee.full_name || "Tanpa Nama",
                    email: employee.email || "",
                    avatar_url: employee.avatar_url || null,
                    role: employee.role || "Employee",
                    status: employee.status || "active",
                    joined_at: employee.joined_at || null,
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
    }
    catch (error) {
        console.error("Get management employee detail error:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
});
router.get("/:id", auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const id = req.params.id;
        // UUID format guard
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({ success: false, message: "Invalid attendance ID format" });
        }
        const query = (0, drizzle_orm_1.sql) `
      SELECT 
        a.id,
        a.work_mode,
        a.check_in_time,
        a.check_in_latitude,
        a.check_in_longitude,
        a.check_in_address,
        a.check_in_photo_url,
        a.check_out_time,
        a.check_out_latitude,
        a.check_out_longitude,
        a.check_out_address,
        a.check_out_photo_url,
        a.created_at,
        a.updated_at,
        (CASE WHEN (a.check_in_time AT TIME ZONE 'Asia/Jakarta')::time > COALESCE(c.work_start_time, '08:00:00'::time) 
          AND (
            CASE EXTRACT(ISODOW FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF(c.work_days, '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN true ELSE false END) as is_terlambat,
        (CASE WHEN a.check_out_time IS NOT NULL 
          AND (a.check_out_time AT TIME ZONE 'Asia/Jakarta')::time < COALESCE(c.work_end_time, '17:00:00'::time) 
          AND (
            CASE EXTRACT(ISODOW FROM a.check_in_time AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF(c.work_days, '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN true ELSE false END) as is_pulang_cepat
      FROM attendances a
      LEFT JOIN companies c ON a.company_id = c.id
      WHERE a.id = ${id}
        AND a.deleted_at IS NULL
        AND (
          a.profile_id = ${userId}
          OR EXISTS (
            SELECT 1 FROM company_members cm 
            WHERE cm.profile_id = ${userId} 
              AND cm.company_id = a.company_id 
              AND cm.role IN ('owner', 'admin', 'manager') 
              AND cm.status = 'active' 
              AND cm.deleted_at IS NULL
          )
        )
      LIMIT 1
    `;
        const detailRes = await db_1.db.execute(query);
        if (detailRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Attendance not found" });
        }
        const row = detailRes.rows[0];
        const detail = {
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
            created_at: row.created_at,
            updated_at: row.updated_at,
            is_terlambat: Boolean(row.is_terlambat),
            is_pulang_cepat: Boolean(row.is_pulang_cepat),
        };
        return res.status(200).json({
            success: true,
            data: detail
        });
    }
    catch (error) {
        console.error("Get attendance detail error:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
});
exports.default = router;
