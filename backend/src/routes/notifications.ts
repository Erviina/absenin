import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { db } from "../db";
import { notifications } from "../db/schema";
import { eq, desc, count, and } from "drizzle-orm";

const router = Router();

router.get("/unread-count", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;

    const [result] = await db.select({
      count: count()
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipient_id, user.id),
        eq(notifications.is_read, false)
      )
    );

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil jumlah notifikasi belum dibaca",
      data: {
        count: result.count
      },
    });
  } catch (error: any) {
    console.error("Get unread-count error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

router.get("/", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;

    const results = await db.select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      reference_id: notifications.reference_id,
      is_read: notifications.is_read,
      created_at: notifications.created_at,
    })
    .from(notifications)
    .where(eq(notifications.recipient_id, user.id))
    .orderBy(desc(notifications.created_at))
    .limit(20);

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil notifikasi",
      data: results,
    });
  } catch (error: any) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

router.patch("/read-all", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;

    const result = await db.update(notifications)
      .set({ is_read: true })
      .where(
        and(
          eq(notifications.recipient_id, user.id),
          eq(notifications.is_read, false)
        )
      )
      .returning({ id: notifications.id });

    return res.status(200).json({
      success: true,
      message: "Semua notifikasi telah ditandai sudah dibaca",
      data: {
        updatedCount: result.length
      },
    });
  } catch (error: any) {
    console.error("Mark all as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

router.patch("/:id/read", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const id = req.params.id as string;

    const result = await db.update(notifications)
      .set({ is_read: true })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipient_id, user.id)
        )
      )
      .returning({ id: notifications.id, is_read: notifications.is_read });

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notifikasi tidak ditemukan",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notifikasi ditandai sudah dibaca",
      data: result[0],
    });
  } catch (error: any) {
    console.error("Mark as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

export default router;
