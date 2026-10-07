import { Router, Request, Response } from "express";
import { db } from "../db";
import { tasks, profiles } from "../db/schema";
import { eq, desc, or, and } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import crypto from "crypto";

const router = Router();

// Get all tasks for the current user (personal) and their company (group)
router.get("/", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const profileId = (req as any).user?.id;
    if (!profileId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const profileRes = await db.select().from(profiles).where(eq(profiles.id, profileId));
    const companyId = profileRes[0]?.company_id;

    const conditions = [];
    conditions.push(and(eq(tasks.profile_id, profileId), eq(tasks.type, "personal")));
    
    if (companyId) {
      conditions.push(and(eq(tasks.company_id, companyId), eq(tasks.type, "group")));
    }

    const userTasks = await db.select().from(tasks).where(or(...conditions)).orderBy(desc(tasks.created_at));

    res.json(userTasks);
  } catch (error: any) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Create a new task
router.post("/", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const profileId = (req as any).user?.id;
    if (!profileId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { title, date, time, note, type } = req.body;

    if (!title) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    let companyId = null;
    if (type === "group") {
      const profileRes = await db.select().from(profiles).where(eq(profiles.id, profileId));
      companyId = profileRes[0]?.company_id;
      if (!companyId) {
        res.status(400).json({ error: "Cannot create group task: No company associated" });
        return;
      }
    }

    const [newTask] = await db
      .insert(tasks)
      .values({
        id: crypto.randomUUID(),
        profile_id: profileId,
        company_id: companyId,
        title,
        date,
        time,
        note: note || null,
        type: type || "personal",
        completed: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    res.status(201).json(newTask);
  } catch (error: any) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update a task
router.patch("/:id", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const profileId = (req as any).user?.id;
    if (!profileId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const taskId = req.params.id;
    const { title, date, time, note, completed } = req.body;

    const existingTask = await db.select().from(tasks).where(eq(tasks.id, taskId));

    if (existingTask.length === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    // Only allow updating if it's the user's personal task, or if it's a group task in the user's company
    const profileRes = await db.select().from(profiles).where(eq(profiles.id, profileId));
    const companyId = profileRes[0]?.company_id;

    if (existingTask[0].type === "personal" && existingTask[0].profile_id !== profileId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    } else if (existingTask[0].type === "group" && existingTask[0].company_id !== companyId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [updatedTask] = await db
      .update(tasks)
      .set({
        title: title !== undefined ? title : existingTask[0].title,
        date: date !== undefined ? date : existingTask[0].date,
        time: time !== undefined ? time : existingTask[0].time,
        note: note !== undefined ? note : existingTask[0].note,
        completed: completed !== undefined ? completed : existingTask[0].completed,
        updated_at: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning();

    res.json(updatedTask);
  } catch (error: any) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete a task
router.delete("/:id", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const profileId = (req as any).user?.id;
    if (!profileId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const taskId = req.params.id;

    const existingTask = await db.select().from(tasks).where(eq(tasks.id, taskId));

    if (existingTask.length === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const profileRes = await db.select().from(profiles).where(eq(profiles.id, profileId));
    const companyId = profileRes[0]?.company_id;

    if (existingTask[0].type === "personal" && existingTask[0].profile_id !== profileId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    } else if (existingTask[0].type === "group" && existingTask[0].company_id !== companyId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await db.delete(tasks).where(eq(tasks.id, taskId));

    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
