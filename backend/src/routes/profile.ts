import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { profiles } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import multer from "multer";
import { uploadAvatarPhoto } from "../utils/storage";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

const updateProfileSchema = z.object({
  full_name: z.string().min(1, "Nama tidak boleh kosong").optional(),
  avatar_url: z.string().url("Format URL tidak valid").optional(),
}).strict(); // Tolak field yang tidak diizinkan

router.patch("/", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;

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
    const profileResult = await db.select().from(profiles).where(eq(profiles.id, userId));
    const profile = profileResult[0];

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile tidak ditemukan",
        errors: [],
      });
    }

    // 4. Update tabel
    const updates: any = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    // Gunakan transaksi atau langsung update
    const updateRes = await db.update(profiles)
      .set({
        ...updates,
      })
      .where(eq(profiles.id, userId))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Profile berhasil diperbarui",
      data: updateRes[0],
    });

  } catch (error: any) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

router.post("/avatar", authenticate, upload.single("avatar"), async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: "File foto tidak ditemukan." });
    }

    // 1. Upload photo to Supabase
    let photoUrl;
    try {
      photoUrl = await uploadAvatarPhoto(file.buffer, file.mimetype, userId);
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }

    // 2. Update profile with new avatar URL
    const updateRes = await db.update(profiles)
      .set({ avatar_url: photoUrl })
      .where(eq(profiles.id, userId))
      .returning();

    if (!updateRes.length) {
      return res.status(404).json({ success: false, message: "Profile tidak ditemukan" });
    }

    return res.status(200).json({
      success: true,
      message: "Avatar berhasil diperbarui",
      data: { avatarUrl: photoUrl },
    });
  } catch (error: any) {
    console.error("Upload avatar error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

export default router;
