"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const storage_1 = require("../utils/storage");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const router = (0, express_1.Router)();
const updateProfileSchema = zod_1.z.object({
    full_name: zod_1.z.string().min(1, "Nama tidak boleh kosong").optional(),
    avatar_url: zod_1.z.string().url("Format URL tidak valid").optional(),
}).strict(); // Tolak field yang tidak diizinkan
router.patch("/", auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        // 1. Validasi Body
        const parseResult = updateProfileSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: parseResult.error.issues.map((e) => e.message),
            });
        }
        const { full_name, avatar_url } = parseResult.data;
        // 2. Cek apakah ada field yang diupdate
        if (full_name === undefined && avatar_url === undefined) {
            return res.status(400).json({
                success: false,
                message: "Tidak ada data yang dikirim untuk diupdate",
                errors: [],
            });
        }
        // 3. Pastikan profile exist
        const profileResult = await db_1.db.select().from(schema_1.profiles).where((0, drizzle_orm_1.eq)(schema_1.profiles.id, userId));
        const profile = profileResult[0];
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profile tidak ditemukan",
                errors: [],
            });
        }
        // 4. Update tabel
        const updates = {};
        if (full_name !== undefined)
            updates.full_name = full_name;
        if (avatar_url !== undefined)
            updates.avatar_url = avatar_url;
        // Gunakan transaksi atau langsung update
        const updateRes = await db_1.db.update(schema_1.profiles)
            .set({
            ...updates,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.profiles.id, userId))
            .returning();
        return res.status(200).json({
            success: true,
            message: "Profile berhasil diperbarui",
            data: updateRes[0],
        });
    }
    catch (error) {
        console.error("Update profile error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
router.post("/avatar", auth_1.authenticate, upload.single("avatar"), async (req, res) => {
    try {
        const userId = req.user.id;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, message: "File foto tidak ditemukan." });
        }
        // 1. Upload photo to Supabase
        let photoUrl;
        try {
            photoUrl = await (0, storage_1.uploadAvatarPhoto)(file.buffer, file.mimetype, userId);
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        // 2. Update profile with new avatar URL
        const updateRes = await db_1.db.update(schema_1.profiles)
            .set({ avatar_url: photoUrl })
            .where((0, drizzle_orm_1.eq)(schema_1.profiles.id, userId))
            .returning();
        if (!updateRes.length) {
            return res.status(404).json({ success: false, message: "Profile tidak ditemukan" });
        }
        return res.status(200).json({
            success: true,
            message: "Avatar berhasil diperbarui",
            data: { avatarUrl: photoUrl },
        });
    }
    catch (error) {
        console.error("Upload avatar error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errors: [error.message],
        });
    }
});
exports.default = router;
