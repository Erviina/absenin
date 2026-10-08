import { Router, Request, Response } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { z } from "zod";

const router = Router();

const agendaSchema = z.object({
  title: z.string().min(1, "Judul agenda tidak boleh kosong"),
  notes: z.string().optional(),
  start_time: z.string().refine(val => !isNaN(Date.parse(val)), "Format waktu mulai tidak valid"),
  end_time: z.string().refine(val => !isNaN(Date.parse(val)), "Format waktu selesai tidak valid"),
  agenda_category_id: z.string().uuid().nullable().optional(),
}).strict().refine(data => new Date(data.end_time) > new Date(data.start_time), {
  message: "Waktu selesai tidak boleh lebih awal dari waktu mulai",
  path: ["end_time"]
});

const getProfileAndCompany = async (userId: string): Promise<{ profileId: string, companyId: string } | null> => {
  const profileRes = await db.execute(sql`SELECT id, company_id FROM profiles WHERE id = ${userId} AND deleted_at IS NULL`);
  if (profileRes.rows.length === 0 || !profileRes.rows[0].company_id) {
    return null;
  }
  return { profileId: profileRes.rows[0].id as string, companyId: profileRes.rows[0].company_id as string };
};

const getUserRoles = async (profileId: string) => {
  const rolesRes = await db.execute(sql`SELECT role FROM profile_roles WHERE profile_id = ${profileId}`);
  return rolesRes.rows.map((r: any) => r.role);
};

router.get("/", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const profileData = await getProfileAndCompany(user.id);
    if (!profileData) return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });

    const agendasRes = await db.execute(sql`
      SELECT 
        a.id, 
        a.title, 
        a.notes, 
        a.start_time, 
        a.end_time, 
        a.created_at, 
        c.id as category_id, 
        c.name as category_name
      FROM agendas a
      LEFT JOIN agendas_categories c ON a.agenda_category_id = c.id
      WHERE a.company_id = ${profileData.companyId} 
        AND a.deleted_at IS NULL
      ORDER BY a.start_time ASC
    `);

    const formattedAgendas = agendasRes.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      notes: row.notes,
      start_time: row.start_time,
      end_time: row.end_time,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name
      } : null,
      created_at: row.created_at
    }));

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

router.post("/", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const profileData = await getProfileAndCompany(user.id);
    if (!profileData) return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });

    const roles = await getUserRoles(profileData.profileId);
    if (!roles.includes("Admin") && !roles.includes("Manager")) {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }

    const parseResult = agendaSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, message: "Data tidak valid", errors: parseResult.error.issues });
    }

    const data = parseResult.data;
    
    const insertRes = await db.execute(sql`
      INSERT INTO agendas (
        company_id, profile_id, title, notes, start_time, end_time, agenda_category_id, created_by
      ) VALUES (
        ${profileData.companyId}, ${profileData.profileId}, ${data.title}, ${data.notes || null}, 
        ${data.start_time}, ${data.end_time}, ${data.agenda_category_id || null}, ${profileData.profileId}
      )
      RETURNING *
    `);

    return res.status(201).json({
      success: true,
      message: "Agenda berhasil dibuat",
      data: insertRes.rows[0]
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
    
    const profileData = await getProfileAndCompany(user.id);
    if (!profileData) return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });

    const roles = await getUserRoles(profileData.profileId);
    if (!roles.includes("Admin") && !roles.includes("Manager")) {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }

    const parseResult = agendaSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, message: "Data tidak valid", errors: parseResult.error.issues });
    }

    const data = parseResult.data;

    const checkRes = await db.execute(sql`
      SELECT id FROM agendas 
      WHERE id = ${agendaId} AND company_id = ${profileData.companyId} AND deleted_at IS NULL
    `);
    
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Agenda tidak ditemukan" });
    }

    const updateRes = await db.execute(sql`
      UPDATE agendas 
      SET 
        title = ${data.title},
        notes = ${data.notes || null},
        start_time = ${data.start_time},
        end_time = ${data.end_time},
        agenda_category_id = ${data.agenda_category_id || null},
        updated_at = NOW(),
        updated_by = ${profileData.profileId}
      WHERE id = ${agendaId}
      RETURNING *
    `);

    return res.status(200).json({
      success: true,
      message: "Agenda berhasil diubah",
      data: updateRes.rows[0]
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
    
    const profileData = await getProfileAndCompany(user.id);
    if (!profileData) return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });

    const roles = await getUserRoles(profileData.profileId);
    if (!roles.includes("Admin") && !roles.includes("Manager")) {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }

    const checkRes = await db.execute(sql`
      SELECT id FROM agendas 
      WHERE id = ${agendaId} AND company_id = ${profileData.companyId} AND deleted_at IS NULL
    `);
    
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Agenda tidak ditemukan" });
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
