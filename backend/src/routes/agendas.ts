import { Router, Request, Response } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { z } from "zod";
import { resolveTenant } from "../utils/tenant";

const router = Router();

const agendaBaseSchema = z.object({
  title: z.string().min(1, "Judul agenda tidak boleh kosong"),
  notes: z.string().optional().nullable(),
  start_time: z.string().refine(val => !isNaN(Date.parse(val)), "Format waktu mulai tidak valid"),
  end_time: z.string().refine(val => !isNaN(Date.parse(val)), "Format waktu selesai tidak valid"),
  agenda_category_id: z.string().uuid().nullable().optional(),
  type: z.enum(["COMPANY", "PERSONAL"]).optional(),
  company_id: z.string().uuid().optional().nullable(),
  is_all_day: z.boolean().optional().nullable(),
  link: z.string().optional().nullable(),
}).passthrough();

const agendaSchema = agendaBaseSchema.refine(data => new Date(data.end_time) >= new Date(data.start_time), {
  message: "Waktu selesai tidak boleh lebih awal dari waktu mulai",
  path: ["end_time"]
});

const patchBaseSchema = agendaBaseSchema.omit({ type: true });
const patchSchema = patchBaseSchema.refine(data => new Date(data.end_time) >= new Date(data.start_time), {
  message: "Waktu selesai tidak boleh lebih awal dari waktu mulai",
  path: ["end_time"]
});

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", 
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

function formatAgendaItem(row: any) {
  const startDate = new Date(row.start_time);
  const endDate = new Date(row.end_time);
  const isValidStart = !isNaN(startDate.getTime());
  const isValidEnd = !isNaN(endDate.getTime());

  const isSameDay = isValidStart && isValidEnd &&
                    startDate.getFullYear() === endDate.getFullYear() &&
                    startDate.getMonth() === endDate.getMonth() &&
                    startDate.getDate() === endDate.getDate();

  const isAllDay = Boolean(row.is_all_day);

  const startTimeStr = isValidStart
    ? `${String(startDate.getHours()).padStart(2, '0')}.${String(startDate.getMinutes()).padStart(2, '0')}`
    : "";
  const endTimeStr = isValidEnd
    ? `${String(endDate.getHours()).padStart(2, '0')}.${String(endDate.getMinutes()).padStart(2, '0')}`
    : "";

  let timeRange = "";
  if (isAllDay) {
    if (isSameDay) {
      timeRange = "Seharian";
    } else {
      timeRange = `${startDate.getDate()} ${SHORT_MONTHS[startDate.getMonth()]} - ${endDate.getDate()} ${SHORT_MONTHS[endDate.getMonth()]} (Seharian)`;
    }
  } else if (isValidStart && isValidEnd) {
    if (isSameDay) {
      timeRange = `${startTimeStr} - ${endTimeStr} WIB`;
    } else {
      timeRange = `${startDate.getDate()} ${SHORT_MONTHS[startDate.getMonth()]} ${startTimeStr} - ${endDate.getDate()} ${SHORT_MONTHS[endDate.getMonth()]} ${endTimeStr} WIB`;
    }
  }

  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    start_time: row.start_time,
    end_time: row.end_time,
    time_range: timeRange,
    is_same_day: isSameDay,
    is_all_day: isAllDay,
    scope: row.type === "COMPANY" ? "company" : "personal",
    type: row.type,
    category: row.category_id ? {
      id: row.category_id,
      name: row.category_name
    } : null,
    link_or_location: row.link_or_location || null,
    link: row.link_or_location || null,
    created_at: row.created_at
  };
}

const getProfileAndCompany = async (req: Request, userId: string): Promise<{ profileId: string, companyId: string, role: string, isManagement: boolean } | null> => {
  const tenant = await resolveTenant(req, userId);
  if (!tenant) return null;
  return { profileId: userId, companyId: tenant.companyId, role: tenant.role, isManagement: tenant.isManagement };
};

const getUserRoles = async (profileId: string) => {
  const rolesRes = await db.execute(sql`SELECT role FROM profile_roles WHERE profile_id = ${profileId}`);
  return rolesRes.rows.map((r: any) => r.role);
};

router.get("/categories", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const categoriesRes = await db.execute(sql`
      SELECT id, name, description
      FROM agendas_categories
      ORDER BY 
        CASE 
          WHEN LOWER(name) LIKE '%lainnya%' OR LOWER(name) LIKE '%lain-lain%' OR LOWER(name) = 'other' THEN 1 
          ELSE 0 
        END ASC, 
        name ASC
    `);

    return res.status(200).json({
      success: true,
      data: categoriesRes.rows
    });
  } catch (error: any) {
    console.error("Get agenda categories error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const profileData = await getProfileAndCompany(req, user.id);
    if (!profileData) return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });

    const { start_date, end_date, start_time, end_time, from, to, month, year, type } = req.query;

    const rangeStart = (start_time || start_date || from) as string | undefined;
    const rangeEnd = (end_time || end_date || to) as string | undefined;

    let dateConditions = sql``;

    if (rangeStart && rangeEnd) {
      dateConditions = sql`AND a.start_time <= ${rangeEnd}::timestamptz AND a.end_time >= ${rangeStart}::timestamptz`;
    } else if (rangeStart) {
      dateConditions = sql`AND a.end_time >= ${rangeStart}::timestamptz`;
    } else if (rangeEnd) {
      dateConditions = sql`AND a.start_time <= ${rangeEnd}::timestamptz`;
    } else if (month && year) {
      const monthNum = parseInt(month as string, 10);
      const yearNum = parseInt(year as string, 10);
      if (!isNaN(monthNum) && !isNaN(yearNum)) {
        const startOfMonth = new Date(yearNum, monthNum - 1, 1).toISOString();
        const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59, 999).toISOString();
        dateConditions = sql`AND a.start_time <= ${endOfMonth}::timestamptz AND a.end_time >= ${startOfMonth}::timestamptz`;
      }
    }

    let typeCondition = sql``;
    if (type && (type === "COMPANY" || type === "PERSONAL")) {
      typeCondition = sql`AND a.type = ${type}`;
    }

    const agendasRes = await db.execute(sql`
      SELECT 
        a.id, 
        a.title, 
        a.notes, 
        a.start_time, 
        a.end_time, 
        a.created_at, 
        a.profile_id,
        a.type,
        a.link_or_location,
        a.is_all_day,
        c.id as category_id, 
        c.name as category_name
      FROM agendas a
      LEFT JOIN agendas_categories c ON a.agenda_category_id = c.id
      WHERE a.company_id = ${profileData.companyId} 
        AND (a.type = 'COMPANY' OR (a.type = 'PERSONAL' AND a.profile_id = ${profileData.profileId}))
        AND a.deleted_at IS NULL
        ${dateConditions}
        ${typeCondition}
      ORDER BY a.start_time ASC
    `);

    const formattedAgendas = agendasRes.rows.map(formatAgendaItem);

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil daftar agenda",
      data: formattedAgendas
    });
  } catch (error: any) {
    console.error("Get agendas error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", errors: [error.message] });
  }
});

// GET /api/agendas/management/employees/:employeeId - Get company agendas for employee monitoring
router.get("/management/employees/:employeeId", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const caller = (req as any).user;
    const { employeeId } = req.params;

    const tenant = await resolveTenant(req, caller.id);
    if (!tenant) return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });

    if (!tenant.isManagement) {
      return res.status(403).json({ success: false, message: "Forbidden: Hanya Admin atau Manager yang dapat mengakses." });
    }

    const companyId = tenant.companyId;

    // Verify employee is in company
    const memberCheck = await db.execute(sql`
      SELECT profile_id FROM company_members
      WHERE company_id = ${companyId}
        AND profile_id = ${employeeId}
        AND status = 'active'
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (memberCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Karyawan tidak ditemukan di perusahaan ini." });
    }

    const { start_date, end_date, month, year } = req.query;

    let dateConditions = sql``;
    if (start_date && end_date) {
      // Use COALESCE so agendas with NULL end_time still match via start_time
      dateConditions = sql`AND (a.start_time AT TIME ZONE 'Asia/Jakarta')::date <= ${end_date}::date AND (COALESCE(a.end_time, a.start_time) AT TIME ZONE 'Asia/Jakarta')::date >= ${start_date}::date`;
    } else if (month && year) {
      const monthNum = parseInt(month as string, 10);
      const yearNum = parseInt(year as string, 10);
      if (!isNaN(monthNum) && !isNaN(yearNum)) {
        // Build range in UTC to avoid server timezone offset issues
        const startOfMonth = new Date(Date.UTC(yearNum, monthNum - 1, 1)).toISOString();
        const endOfMonth = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999)).toISOString();
        // COALESCE(end_time, start_time) ensures rows with NULL end_time still match
        dateConditions = sql`AND a.start_time <= ${endOfMonth}::timestamptz AND COALESCE(a.end_time, a.start_time) >= ${startOfMonth}::timestamptz`;
      }
    }
    // If no date filter provided: return all COMPANY agendas (no dateConditions applied)

    // Monitoring scope:
    // - COMPANY agendas: company-wide events visible to all management
    // - PERSONAL agendas of this specific employee (profile_id = employeeId):
    //   Management monitoring an employee's own schedule is a legitimate use case.
    //   This does NOT expose other employees' personal agendas.
    const agendasRes = await db.execute(sql`
      SELECT 
        a.id, 
        a.title, 
        a.notes, 
        a.start_time, 
        a.end_time, 
        a.created_at, 
        a.profile_id,
        a.type,
        a.link_or_location,
        a.is_all_day,
        c.id as category_id, 
        c.name as category_name
      FROM agendas a
      LEFT JOIN agendas_categories c ON a.agenda_category_id = c.id
      WHERE a.company_id = ${companyId} 
        AND (
          a.type = 'COMPANY'
          OR (a.type = 'PERSONAL' AND a.profile_id = ${employeeId})
        )
        AND a.deleted_at IS NULL
        ${dateConditions}
      ORDER BY a.start_time ASC
    `);

    const formattedAgendas = agendasRes.rows.map(row => {
      const item = formatAgendaItem(row);
      const now = new Date();
      const start = item.start_time ? new Date(item.start_time) : null;
      const end = item.end_time ? new Date(item.end_time) : null;

      let status: "upcoming" | "ongoing" | "past" = "upcoming";
      if (start && end) {
        if (now >= start && now <= end) status = "ongoing";
        else if (now > end) status = "past";
        else status = "upcoming";
      } else if (start) {
        if (now > start) status = "past";
        else status = "upcoming";
      }

      return {
        ...item,
        status,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil agenda karyawan",
      data: formattedAgendas
    });
  } catch (error: any) {
    console.error("Get management employee agendas error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/:id", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const agendaId = req.params.id;
    const profileData = await getProfileAndCompany(req, user.id);
    if (!profileData) return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });

    const agendaRes = await db.execute(sql`
      SELECT 
        a.id, 
        a.title, 
        a.notes, 
        a.start_time, 
        a.end_time, 
        a.created_at, 
        a.profile_id,
        a.type,
        a.link_or_location,
        a.is_all_day,
        c.id as category_id, 
        c.name as category_name
      FROM agendas a
      LEFT JOIN agendas_categories c ON a.agenda_category_id = c.id
      WHERE a.id = ${agendaId}
        AND a.company_id = ${profileData.companyId} 
        AND (a.type = 'COMPANY' OR (a.type = 'PERSONAL' AND a.profile_id = ${profileData.profileId}))
        AND a.deleted_at IS NULL
    `);

    if (agendaRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Agenda tidak ditemukan" });
    }

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil detail agenda",
      data: formatAgendaItem(agendaRes.rows[0])
    });
  } catch (error: any) {
    console.error("Get agenda detail error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", errors: [error.message] });
  }
});

router.post("/", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const profileData = await getProfileAndCompany(req, user.id);
    if (!profileData) return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });

    const parseResult = agendaSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, message: "Data tidak valid", errors: parseResult.error.issues });
    }

    const data = parseResult.data;
    const agendaType = data.type || "COMPANY";
    
    if (agendaType === "COMPANY") {
      if (!profileData.isManagement) {
        return res.status(403).json({ success: false, message: "Akses ditolak. Hanya Owner/Admin/Manager yang dapat membuat agenda organisasi atau perusahaan" });
      }
    }

    const linkOrLoc = data.link_or_location || data.link || null;
    const isAllDay = Boolean(data.is_all_day);
    const insertRes = await db.execute(sql`
      INSERT INTO agendas (
        company_id, profile_id, type, title, notes, start_time, end_time, agenda_category_id, link_or_location, is_all_day, created_by
      ) VALUES (
        ${profileData.companyId}, ${profileData.profileId}, ${agendaType}, ${data.title}, ${data.notes || null}, 
        ${data.start_time}, ${data.end_time}, ${data.agenda_category_id || null}, ${linkOrLoc}, ${isAllDay}, ${profileData.profileId}
      )
      RETURNING *
    `);

    return res.status(201).json({
      success: true,
      message: "Agenda berhasil dibuat",
      data: formatAgendaItem(insertRes.rows[0])
    });
  } catch (error: any) {
    console.error("Create agenda error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", errors: [error.message] });
  }
});

router.patch("/:id", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const agendaId = req.params.id;
    
    const profileData = await getProfileAndCompany(req, user.id);
    if (!profileData) return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });

    // Type tidak boleh diubah melalui PATCH, jadi kita omit dari validasi
    
    const parseResult = patchSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, message: "Data tidak valid", errors: parseResult.error.issues });
    }

    const data = parseResult.data;

    const checkRes = await db.execute(sql`
      SELECT id, type, profile_id FROM agendas 
      WHERE id = ${agendaId} AND company_id = ${profileData.companyId} AND deleted_at IS NULL
    `);
    
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Agenda tidak ditemukan" });
    }

    const existingAgenda = checkRes.rows[0];

    // Validasi otorisasi edit berdasarkan type
    if (existingAgenda.type === "COMPANY") {
      if (!profileData.isManagement) {
        return res.status(403).json({ success: false, message: "Hanya Owner/Admin/Manager yang dapat mengubah agenda organisasi atau perusahaan" });
      }
    } else if (existingAgenda.type === "PERSONAL") {
      if (existingAgenda.profile_id !== profileData.profileId) {
        return res.status(403).json({ success: false, message: "Anda hanya dapat mengubah agenda pribadi Anda sendiri" });
      }
    }

    const linkOrLoc = data.link_or_location || data.link || null;
    const isAllDayUpdate = data.is_all_day !== undefined ? Boolean(data.is_all_day) : null;
    const updateRes = await db.execute(sql`
      UPDATE agendas 
      SET 
        title = ${data.title},
        notes = ${data.notes || null},
        start_time = ${data.start_time},
        end_time = ${data.end_time},
        agenda_category_id = ${data.agenda_category_id || null},
        link_or_location = ${linkOrLoc},
        is_all_day = COALESCE(${isAllDayUpdate}, is_all_day),
        updated_at = NOW(),
        updated_by = ${profileData.profileId}
      WHERE id = ${agendaId}
      RETURNING *
    `);

    return res.status(200).json({
      success: true,
      message: "Agenda berhasil diubah",
      data: formatAgendaItem(updateRes.rows[0])
    });
  } catch (error: any) {
    console.error("Update agenda error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", errors: [error.message] });
  }
});

router.delete("/:id", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const agendaId = req.params.id;
    
    const profileData = await getProfileAndCompany(req, user.id);
    if (!profileData) return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });

    const checkRes = await db.execute(sql`
      SELECT id, type, profile_id FROM agendas 
      WHERE id = ${agendaId} AND company_id = ${profileData.companyId} AND deleted_at IS NULL
    `);
    
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Agenda tidak ditemukan" });
    }

    const existingAgenda = checkRes.rows[0];

    // Validasi otorisasi hapus berdasarkan type
    if (existingAgenda.type === "COMPANY") {
      if (!profileData.isManagement) {
        return res.status(403).json({ success: false, message: "Hanya Owner/Admin/Manager yang dapat menghapus agenda perusahaan" });
      }
    } else if (existingAgenda.type === "PERSONAL") {
      if (existingAgenda.profile_id !== profileData.profileId) {
        return res.status(403).json({ success: false, message: "Anda hanya dapat menghapus agenda pribadi Anda sendiri" });
      }
    }

    await db.execute(sql`
      UPDATE agendas 
      SET 
        deleted_at = NOW(),
        deleted_by = ${profileData.profileId}
      WHERE id = ${agendaId}
    `);

    return res.status(200).json({
      success: true,
      message: "Agenda berhasil dihapus"
    });
  } catch (error: any) {
    console.error("Delete agenda error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", errors: [error.message] });
  }
});

export default router;
