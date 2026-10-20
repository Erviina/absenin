"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middleware/auth");
const schema_1 = require("../db/schema");
const multer_1 = __importDefault(require("multer"));
const storage_1 = require("../utils/storage");
const tenant_1 = require("../utils/tenant");
const pagination_1 = require("../utils/pagination");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const router = (0, express_1.Router)();
const createCompanySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Nama perusahaan wajib diisi"),
    address: zod_1.z.string().min(1, "Alamat wajib diisi"),
    category_id: zod_1.z.string().uuid().optional().nullable(),
    category_code: zod_1.z.enum(["community", "organization", "business"]).optional(),
});
const updateCompanySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Nama perusahaan tidak boleh kosong").optional(),
    phone: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    latitude: zod_1.z.number().optional(),
    longitude: zod_1.z.number().optional(),
    work_days: zod_1.z.array(zod_1.z.string()).optional(),
    work_start_time: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, "Format waktu harus HH:mm atau HH:mm:ss").optional(),
    work_end_time: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, "Format waktu harus HH:mm atau HH:mm:ss").optional(),
}).refine(data => data.name !== undefined ||
    data.phone !== undefined ||
    data.address !== undefined ||
    data.latitude !== undefined ||
    data.longitude !== undefined ||
    data.work_days !== undefined ||
    data.work_start_time !== undefined ||
    data.work_end_time !== undefined, {
    message: "Minimal satu field harus diisi"
});
const roleUpdateSchema = zod_1.z.object({
    roles: zod_1.z.array(zod_1.z.enum(["Employee", "Manager", "Admin"]))
}).refine(data => data.roles.includes("Employee"), {
    message: "Role Employee wajib disertakan"
});
const roleLabelMap = {
    admin: "Admin",
    manager: "Manager",
    member: "Karyawan",
    employee: "Karyawan",
    owner: "Owner",
};
// GET /api/companies/categories
router.get("/categories", async (req, res) => {
    try {
        const catsRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT id, code, name, description 
      FROM company_categories 
      ORDER BY name ASC
    `);
        return res.status(200).json({
            success: true,
            data: catsRes.rows
        });
    }
    catch (error) {
        console.error("Get company categories error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});
// GET /api/companies/memberships - Get all active company memberships for current user
router.get("/memberships", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        // 1. Auto-sync legacy profile company_id into company_members if not exists yet
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      INSERT INTO company_members (id, company_id, profile_id, role, status, joined_at)
      SELECT 
        gen_random_uuid(), 
        p.company_id, 
        p.id, 
        CASE 
          WHEN EXISTS (SELECT 1 FROM companies c WHERE c.id = p.company_id AND c.created_by = p.id) THEN 'owner'
          WHEN EXISTS (SELECT 1 FROM profile_roles pr WHERE pr.profile_id = p.id AND pr.role = 'Admin') THEN 'admin'
          WHEN EXISTS (SELECT 1 FROM profile_roles pr WHERE pr.profile_id = p.id AND pr.role = 'Manager') THEN 'manager'
          ELSE 'member'
        END,
        'active', 
        now()
      FROM profiles p
      WHERE p.id = ${user.id} 
        AND p.company_id IS NOT NULL 
        AND p.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM company_members cm 
          WHERE cm.company_id = p.company_id AND cm.profile_id = p.id
        )
      ON CONFLICT (company_id, profile_id) DO NOTHING
    `);
        // 2. Fetch all active memberships
        const membersRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT 
        cm.id,
        cm.company_id,
        cm.profile_id,
        cm.role,
        cm.status,
        cm.joined_at,
        cm.deleted_at,
        c.id as comp_id,
        c.name as comp_name,
        c.category_id as comp_category_id,
        c.avatar_company_url as comp_avatar_url,
        c.join_code as comp_join_code,
        cc.id as cat_id,
        cc.code as cat_code,
        cc.name as cat_name,
        cc.description as cat_description
      FROM company_members cm
      JOIN companies c ON c.id = cm.company_id
      LEFT JOIN company_categories cc ON cc.id = c.category_id
      WHERE cm.profile_id = ${user.id} 
        AND cm.status = 'active' 
        AND cm.deleted_at IS NULL
        AND c.deleted_at IS NULL
      ORDER BY cm.joined_at DESC
    `);
        const formatted = membersRes.rows.map((row) => ({
            id: row.id,
            company_id: row.company_id,
            profile_id: row.profile_id,
            role: (row.role || "member").toLowerCase(),
            status: row.status,
            joined_at: row.joined_at,
            deleted_at: row.deleted_at,
            company: {
                id: row.comp_id,
                name: row.comp_name,
                category_id: row.comp_category_id,
                avatar_company_url: row.comp_avatar_url,
                join_code: row.comp_join_code,
                category: row.cat_id ? {
                    id: row.cat_id,
                    code: row.cat_code,
                    name: row.cat_name,
                    description: row.cat_description,
                } : null
            }
        }));
        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil daftar membership perusahaan",
            data: formatted
        });
    }
    catch (error) {
        console.error("Get company memberships error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", errors: [error.message] });
    }
});
router.post("/", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const parseResult = createCompanySchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: parseResult.error.issues.map((e) => e.message),
            });
        }
        const { name, address, category_id, category_code } = parseResult.data;
        let targetCategoryId = category_id;
        if (!targetCategoryId && category_code) {
            const catRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT id FROM company_categories WHERE code = ${category_code} LIMIT 1
      `);
            if (catRes.rows.length > 0) {
                targetCategoryId = catRes.rows[0].id;
            }
        }
        // Generate unique join_code (6 uppercase alphanumeric characters)
        const generateJoinCode = () => {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let code = "";
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        };
        const joinCode = generateJoinCode();
        // Use transaction
        const result = await db_1.db.transaction(async (tx) => {
            // 1. Insert company with standard operational hours default (08:00 - 17:00, Senin-Jumat)
            const newCompanyRes = await tx.execute((0, drizzle_orm_1.sql) `
        INSERT INTO companies (
          id, name, address, join_code, category_id, created_by,
          work_start_time, work_end_time, work_days
        )
        VALUES (
          gen_random_uuid(), 
          ${name}, 
          ${address}, 
          ${joinCode}, 
          ${targetCategoryId || null}, 
          ${user.id},
          '08:00:00'::time,
          '17:00:00'::time,
          ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]
        )
        RETURNING *
      `);
            const newCompany = newCompanyRes.rows[0];
            // 2. Insert creator into company_members as 'owner'
            await tx.execute((0, drizzle_orm_1.sql) `
        INSERT INTO company_members (id, company_id, profile_id, role, status, joined_at)
        VALUES (gen_random_uuid(), ${newCompany.id}, ${user.id}, 'owner', 'active', now())
        ON CONFLICT (company_id, profile_id) 
        DO UPDATE SET role = 'owner', status = 'active', deleted_at = NULL
      `);
            // 3. Set profiles.company_id for backward compatibility
            await tx.execute((0, drizzle_orm_1.sql) `
        UPDATE profiles
        SET company_id = ${newCompany.id}
        WHERE id = ${user.id}
      `);
            // 4. Add Employee and Admin roles
            await tx.execute((0, drizzle_orm_1.sql) `
        INSERT INTO profile_roles (profile_id, role)
        SELECT ${user.id}, 'Employee'
        WHERE NOT EXISTS (SELECT 1 FROM profile_roles WHERE profile_id = ${user.id} AND role = 'Employee')
      `);
            await tx.execute((0, drizzle_orm_1.sql) `
        INSERT INTO profile_roles (profile_id, role)
        SELECT ${user.id}, 'Admin'
        WHERE NOT EXISTS (SELECT 1 FROM profile_roles WHERE profile_id = ${user.id} AND role = 'Admin')
      `);
            return newCompany;
        });
        return res.status(201).json({
            success: true,
            message: "Perusahaan berhasil dibuat",
            data: result,
        });
    }
    catch (error) {
        console.error("Create company error:", error);
        // Handle unique constraint violation on join_code
        if (error.code === "23505" && error.constraint === "companies_join_code_unique") {
            return res.status(500).json({
                success: false,
                message: "Gagal membuat kode unik, silakan coba lagi",
                errors: [error.message],
            });
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
router.get("/me", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: "Perusahaan tidak ditemukan",
            });
        }
        const companyId = tenant.companyId;
        const companyRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT c.*, cc.name as category_name, cc.code as category_code
      FROM companies c
      LEFT JOIN company_categories cc ON cc.id = c.category_id
      WHERE c.id = ${companyId} AND c.deleted_at IS NULL
    `);
        if (companyRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Perusahaan tidak ditemukan",
            });
        }
        const company = companyRes.rows[0];
        const memberCountRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT count(*) as count 
      FROM company_members 
      WHERE company_id = ${companyId} AND status = 'active' AND deleted_at IS NULL
    `);
        const memberCount = parseInt(memberCountRes.rows[0].count) || 0;
        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan data perusahaan",
            data: {
                ...company,
                work_start_time: company.work_start_time ? String(company.work_start_time).split(':').slice(0, 2).join(':') : "08:00",
                work_end_time: company.work_end_time ? String(company.work_end_time).split(':').slice(0, 2).join(':') : "17:00",
                work_days: (Array.isArray(company.work_days) && company.work_days.length > 0)
                    ? company.work_days
                    : ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
                role: tenant.role,
                memberCount,
            }
        });
    }
    catch (error) {
        console.error("Get company me error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
// GET /api/companies/members - Daftar anggota aktif perusahaan untuk mention/tugas
router.get("/members", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: "Perusahaan tidak ditemukan atau Anda belum bergabung dengan perusahaan",
            });
        }
        const companyId = tenant.companyId;
        const membersRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT 
        p.id, 
        p.full_name, 
        p.email, 
        p.avatar_url,
        cm.role
      FROM company_members cm
      JOIN profiles p ON p.id = cm.profile_id
      WHERE cm.company_id = ${companyId}
        AND cm.status = 'active'
        AND cm.deleted_at IS NULL
      ORDER BY p.full_name ASC
    `);
        return res.status(200).json({
            success: true,
            data: membersRes.rows,
        });
    }
    catch (error) {
        console.error("Get company members error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});
router.get("/employees", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: "Perusahaan tidak ditemukan atau Anda belum bergabung dengan perusahaan",
            });
        }
        if (!tenant.isManagement) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Akses ditolak. Hanya Owner/Admin/Manager yang dapat melihat daftar karyawan.",
            });
        }
        const companyId = tenant.companyId;
        const { limit, offset } = (0, pagination_1.parsePaginationParams)(req.query, 10, 100);
        const { search, role } = req.query;
        let searchCondition = (0, drizzle_orm_1.sql) ``;
        if (search && typeof search === 'string' && search.trim() !== '') {
            const s = `%${search.trim().toLowerCase()}%`;
            searchCondition = (0, drizzle_orm_1.sql) `AND (
        LOWER(p.full_name) LIKE ${s}
        OR LOWER(p.email) LIKE ${s}
        OR LOWER(cm.role) LIKE ${s}
      )`;
        }
        let roleCondition = (0, drizzle_orm_1.sql) ``;
        if (role && typeof role === 'string' && role.trim() !== '' && role.toLowerCase() !== 'semua') {
            const r = role.trim().toLowerCase();
            if (r === 'admin') {
                roleCondition = (0, drizzle_orm_1.sql) `AND cm.role IN ('owner', 'admin')`;
            }
            else if (r === 'manajemen' || r === 'manager') {
                roleCondition = (0, drizzle_orm_1.sql) `AND cm.role = 'manager'`;
            }
            else if (r === 'karyawan' || r === 'employee' || r === 'member') {
                roleCondition = (0, drizzle_orm_1.sql) `AND cm.role = 'member'`;
            }
        }
        // 1. Total count query
        const countRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT count(*)::int as total
      FROM company_members cm
      JOIN profiles p ON p.id = cm.profile_id
      WHERE cm.company_id = ${companyId}
        AND cm.status = 'active'
        AND cm.deleted_at IS NULL
        ${searchCondition}
        ${roleCondition}
    `);
        const total = Number(countRes.rows[0]?.total || 0);
        // 2. Fetch members with LIMIT & OFFSET and stable order
        const membersRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT 
        p.id, 
        p.full_name, 
        p.email, 
        p.avatar_url,
        cm.role,
        cm.status,
        cm.joined_at
      FROM company_members cm
      JOIN profiles p ON p.id = cm.profile_id
      WHERE cm.company_id = ${companyId}
        AND cm.status = 'active'
        AND cm.deleted_at IS NULL
        ${searchCondition}
        ${roleCondition}
      ORDER BY cm.joined_at ASC, p.id ASC
      LIMIT ${limit} OFFSET ${offset}
    `);
        const employees = membersRes.rows.map((row) => {
            const cmRole = (row.role || "member").toLowerCase();
            let userRoles = ["Employee"];
            if (cmRole === "owner") {
                userRoles = ["Owner", "Admin", "Employee"];
            }
            else if (cmRole === "admin") {
                userRoles = ["Admin", "Employee"];
            }
            else if (cmRole === "manager") {
                userRoles = ["Manager", "Employee"];
            }
            else {
                userRoles = ["Employee"];
            }
            return {
                id: row.id,
                full_name: row.full_name,
                email: row.email,
                avatar_url: row.avatar_url,
                role: cmRole,
                roles: userRoles
            };
        });
        const pagination = (0, pagination_1.buildPaginationMeta)(total, limit, offset);
        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil daftar karyawan",
            data: employees,
            pagination,
            meta: pagination
        });
    }
    catch (error) {
        console.error("Get company employees error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
// Soft Delete a member from the company
router.delete("/employees/:employeeId", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const { employeeId } = req.params;
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        if (!tenant) {
            return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
        }
        if (!tenant.isManagement) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Hanya Owner, Admin, atau Manager yang dapat menghapus/mengeluarkan anggota.",
            });
        }
        if (user.id === employeeId) {
            return res.status(400).json({
                success: false,
                message: "Anda tidak dapat menghapus akun Anda sendiri dari perusahaan.",
            });
        }
        const companyId = tenant.companyId;
        // Check target member
        const targetRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT role FROM company_members
      WHERE company_id = ${companyId} AND profile_id = ${employeeId} AND deleted_at IS NULL
    `);
        if (targetRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Anggota tidak ditemukan atau sudah dihapus." });
        }
        const targetRole = (targetRes.rows[0].role || "member").toLowerCase();
        // Role hierarchy checks
        if (tenant.role === "admin" && (targetRole === "owner" || targetRole === "admin")) {
            return res.status(403).json({ success: false, message: "Admin tidak dapat mengeluarkan Owner atau sesama Admin." });
        }
        if (tenant.role === "manager" && (targetRole === "owner" || targetRole === "admin" || targetRole === "manager")) {
            return res.status(403).json({ success: false, message: "Manager hanya dapat mengeluarkan anggota (karyawan)." });
        }
        // Soft delete member: set deleted_at = now()
        const nowIso = new Date().toISOString();
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE company_members
      SET deleted_at = ${nowIso}, status = 'inactive'
      WHERE company_id = ${companyId} AND profile_id = ${employeeId}
    `);
        // Clear legacy profile company_id if it matched
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE profiles
      SET company_id = NULL
      WHERE id = ${employeeId} AND company_id = ${companyId}
    `);
        // Clear any join requests for this employee in this company
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE company_join_requests
      SET deleted_at = ${nowIso}
      WHERE company_id = ${companyId} AND profile_id = ${employeeId} AND deleted_at IS NULL
    `);
        // Send notification to the removed member
        try {
            const removerRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT full_name, email FROM profiles WHERE id = ${user.id}
      `);
            const removerName = removerRes.rows[0]?.full_name || removerRes.rows[0]?.email || "Manajemen";
            const empRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT full_name, email FROM profiles WHERE id = ${employeeId}
      `);
            const empName = empRes.rows[0]?.full_name || empRes.rows[0]?.email || "Anggota";
            await db_1.db.execute((0, drizzle_orm_1.sql) `
        INSERT INTO notifications (
          id, company_id, recipient_id, type, title, message, is_read, created_at
        )
        VALUES (
          gen_random_uuid(),
          ${companyId},
          ${employeeId},
          'member_removed',
          'Pemberitahuan Keanggotaan',
          ${`Keanggotaan atas nama ${empName} telah dinonaktifkan oleh ${removerName}.`},
          false,
          now()
        )
      `);
        }
        catch (notifErr) {
            console.error("Gagal mengirim notifikasi pengeluaran:", notifErr);
        }
        return res.status(200).json({
            success: true,
            message: "Anggota berhasil dikeluarkan dari perusahaan (soft delete)",
            data: { employee_id: employeeId, deleted_at: nowIso }
        });
    }
    catch (error) {
        console.error("Delete employee error:", error);
        return res.status(500).json({ success: false, message: error.message || "Internal server error", errors: [error.message] });
    }
});
router.patch("/me", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        // 1. Resolve tenant & check authorization first
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: "Perusahaan tidak ditemukan atau Anda belum bergabung dengan perusahaan",
            });
        }
        if (!tenant.isManagement || (tenant.role !== "owner" && tenant.role !== "admin")) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Hanya Owner atau Admin yang dapat mengubah pengaturan perusahaan",
            });
        }
        // 2. Validate request body
        const parseResult = updateCompanySchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: parseResult.error.issues.map((e) => e.message),
            });
        }
        const { name, phone, address, latitude, longitude, work_days } = parseResult.data;
        let { work_start_time, work_end_time } = parseResult.data;
        if (work_start_time) {
            work_start_time = work_start_time.split(':').slice(0, 2).join(':');
        }
        if (work_end_time) {
            work_end_time = work_end_time.split(':').slice(0, 2).join(':');
        }
        const companyId = tenant.companyId;
        const updates = [];
        if (name !== undefined)
            updates.push((0, drizzle_orm_1.sql) `name = ${name}`);
        if (phone !== undefined)
            updates.push((0, drizzle_orm_1.sql) `phone = ${phone}`);
        if (address !== undefined)
            updates.push((0, drizzle_orm_1.sql) `address = ${address}`);
        if (latitude !== undefined)
            updates.push((0, drizzle_orm_1.sql) `latitude = ${latitude}`);
        if (longitude !== undefined)
            updates.push((0, drizzle_orm_1.sql) `longitude = ${longitude}`);
        if (work_days !== undefined) {
            if (Array.isArray(work_days)) {
                if (work_days.length > 0) {
                    const arrayElements = work_days.map((d) => (0, drizzle_orm_1.sql) `${d}`);
                    updates.push((0, drizzle_orm_1.sql) `work_days = ARRAY[${drizzle_orm_1.sql.join(arrayElements, (0, drizzle_orm_1.sql) `, `)}]::text[]`);
                }
                else {
                    updates.push((0, drizzle_orm_1.sql) `work_days = ARRAY[]::text[]`);
                }
            }
        }
        if (work_start_time !== undefined)
            updates.push((0, drizzle_orm_1.sql) `work_start_time = ${work_start_time}`);
        if (work_end_time !== undefined)
            updates.push((0, drizzle_orm_1.sql) `work_end_time = ${work_end_time}`);
        const updateQuery = (0, drizzle_orm_1.sql) `
      UPDATE companies 
      SET ${drizzle_orm_1.sql.join(updates, (0, drizzle_orm_1.sql) `, `)}
      WHERE id = ${companyId}
      RETURNING *
    `;
        const updateRes = await db_1.db.execute(updateQuery);
        if (updateRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Perusahaan tidak ditemukan",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Data perusahaan berhasil diperbarui",
            data: updateRes.rows[0],
        });
    }
    catch (error) {
        console.error("Update company error:", error);
        console.error(error.stack);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
// PATCH /api/companies/employees/:employeeId/roles
router.patch("/employees/:employeeId/roles", auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const { employeeId } = req.params;
        const parseResult = roleUpdateSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: parseResult.error.issues.map((e) => e.message),
            });
        }
        const { roles } = parseResult.data;
        // 1. Resolve tenant for active company and verify management authorization
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: "Perusahaan tidak ditemukan atau Anda belum bergabung dengan perusahaan",
            });
        }
        if (!tenant.isManagement || (tenant.role !== "owner" && tenant.role !== "admin")) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Hanya Owner atau Admin yang dapat mengubah hak akses",
            });
        }
        const companyId = tenant.companyId;
        // Self Role Safety: Admin cannot revoke their own Admin access
        if (user.id === employeeId && !roles.includes("Admin")) {
            return res.status(400).json({
                success: false,
                message: "Anda tidak dapat menghapus akses Admin milik Anda sendiri",
            });
        }
        // 2. Verify target employee in active company
        const targetMemberRes = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT cm.role, cm.status, p.id
      FROM company_members cm
      JOIN profiles p ON p.id = cm.profile_id
      WHERE cm.company_id = ${companyId}
        AND cm.profile_id = ${employeeId}
        AND cm.deleted_at IS NULL
        AND p.deleted_at IS NULL
      LIMIT 1
    `);
        if (targetMemberRes.rows.length === 0 || targetMemberRes.rows[0].status !== "active") {
            return res.status(404).json({
                success: false,
                message: "Karyawan tidak ditemukan dalam perusahaan ini",
            });
        }
        const currentTargetRole = (targetMemberRes.rows[0].role || "member").toLowerCase();
        // 3. Do not allow changing Owner role through employee role update
        if (currentTargetRole === "owner") {
            return res.status(400).json({
                success: false,
                message: "Role Owner tidak dapat diubah melalui alur perubahan role karyawan",
            });
        }
        // 4. Determine roles to set: always preserve Employee role
        const rolesToSet = Array.from(new Set(["Employee", ...roles]));
        let targetCompanyRole = "member";
        if (rolesToSet.includes("Admin")) {
            targetCompanyRole = "admin";
        }
        else if (rolesToSet.includes("Manager")) {
            targetCompanyRole = "manager";
        }
        else {
            targetCompanyRole = "member";
        }
        // 5. Update both company_members and profile_roles in a single transaction
        await db_1.db.transaction(async (tx) => {
            // Re-fetch current role with row-locking to ensure idempotency and prevent duplicate notifications on rapid requests
            const lockRes = await tx.execute((0, drizzle_orm_1.sql) `
        SELECT role
        FROM company_members
        WHERE company_id = ${companyId}
          AND profile_id = ${employeeId}
          AND deleted_at IS NULL
        FOR UPDATE
      `);
            if (lockRes.rows.length === 0) {
                throw new Error("Karyawan tidak ditemukan dalam perusahaan");
            }
            const lockedCurrentRole = (lockRes.rows[0].role || "member").toLowerCase();
            const isRoleChanged = lockedCurrentRole !== targetCompanyRole;
            await tx.execute((0, drizzle_orm_1.sql) `
        UPDATE company_members
        SET role = ${targetCompanyRole}, updated_at = now()
        WHERE company_id = ${companyId}
          AND profile_id = ${employeeId}
          AND role != 'owner'
          AND deleted_at IS NULL
      `);
            await tx.execute((0, drizzle_orm_1.sql) `
        DELETE FROM profile_roles WHERE profile_id = ${employeeId}
      `);
            for (const role of rolesToSet) {
                await tx.execute((0, drizzle_orm_1.sql) `
          INSERT INTO profile_roles (profile_id, role)
          VALUES (${employeeId}, ${role})
        `);
            }
            // 6. Buat notifikasi permanen HANYA jika hak akses benar-benar berubah
            if (isRoleChanged) {
                const newRoleLabel = roleLabelMap[targetCompanyRole] || "Karyawan";
                await tx.insert(schema_1.notifications).values({
                    company_id: companyId,
                    recipient_id: employeeId,
                    type: "ROLE_CHANGED",
                    title: "Perubahan Hak Akses",
                    message: `Hak akses akun Anda telah diperbarui menjadi ${newRoleLabel}.`,
                    reference_id: null,
                    is_read: false,
                });
            }
        });
        return res.status(200).json({
            success: true,
            message: "Hak akses berhasil diperbarui",
            data: {
                employee_id: employeeId,
                company_id: companyId,
                role: targetCompanyRole,
                roles: rolesToSet,
            }
        });
    }
    catch (error) {
        console.error("Update employee roles error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
router.post("/avatar", auth_1.authenticate, upload.single("avatar"), async (req, res) => {
    try {
        const user = req.user;
        // 1. Resolve tenant & check authorization first
        const tenant = await (0, tenant_1.resolveTenant)(req, user.id);
        if (!tenant) {
            return res.status(404).json({ success: false, message: "Anda tidak terhubung ke perusahaan manapun" });
        }
        if (!tenant.isManagement || (tenant.role !== "owner" && tenant.role !== "admin")) {
            return res.status(403).json({ success: false, message: "Forbidden: Hanya Pemilik atau Admin yang dapat mengubah foto perusahaan" });
        }
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, message: "File foto tidak ditemukan." });
        }
        const companyId = tenant.companyId;
        // 2. Upload photo to Supabase
        let photoUrl;
        try {
            photoUrl = await (0, storage_1.uploadCompanyPhoto)(file.buffer, file.mimetype, companyId);
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        // 3. Update company with new avatar URL
        const updateRes = await db_1.db.update(schema_1.companies)
            .set({ avatar_company_url: photoUrl })
            .where((0, drizzle_orm_1.eq)(schema_1.companies.id, companyId))
            .returning();
        if (!updateRes.length) {
            return res.status(404).json({ success: false, message: "Perusahaan tidak ditemukan" });
        }
        return res.status(200).json({
            success: true,
            message: "Foto perusahaan berhasil diperbarui",
            data: { avatar_company_url: photoUrl },
        });
    }
    catch (error) {
        console.error("Upload company avatar error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
exports.default = router;
