import { Router, Request, Response } from "express";
import { db } from "../db";
import { tasks, profiles } from "../db/schema";
import { eq, desc, or, and, isNull } from "drizzle-orm";
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
    conditions.push(and(eq(tasks.profile_id, profileId), isNull(tasks.company_id)));
    
    if (companyId) {
      conditions.push(eq(tasks.company_id, companyId));
    }

    const userTasks = await db.select().from(tasks).where(or(...conditions)).orderBy(desc(tasks.created_at));

    const formattedTasks = userTasks.map(t => {
      const d = t.deadline ? new Date(t.deadline) : null;
      return {
        id: t.id,
        title: t.title,
        date: d ? d.toISOString().split("T")[0] : null,
        time: d ? d.toISOString().split("T")[1].substring(0, 5) : "00:00",
        note: t.notes || "",
        completed: t.is_completed,
        type: t.company_id ? "group" : "personal",
        created_at: t.created_at
      };
    });

    res.json(formattedTasks);
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

    const deadlineStr = `${date || new Date().toISOString().split("T")[0]}T${time || "00:00"}:00Z`;
    const deadline = new Date(deadlineStr);

    const [newTask] = await db
      .insert(tasks)
      .values({
        id: crypto.randomUUID(),
        profile_id: profileId,
        company_id: companyId,
        title,
        deadline,
        notes: note || null,
        is_completed: false,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: profileId
      })
      .returning();

    const d = newTask.deadline ? new Date(newTask.deadline) : null;
    res.status(201).json({
      id: newTask.id,
      title: newTask.title,
      date: d ? d.toISOString().split("T")[0] : null,
      time: d ? d.toISOString().split("T")[1].substring(0, 5) : "00:00",
      note: newTask.notes || "",
      completed: newTask.is_completed,
      type: newTask.company_id ? "group" : "personal",
      created_at: newTask.created_at
    });
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

    const taskId = String(req.params.id);
    const { title, date, time, note, completed } = req.body;

    const existingTask = await db.select().from(tasks).where(eq(tasks.id, taskId));

    if (existingTask.length === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const profileRes = await db.select().from(profiles).where(eq(profiles.id, profileId));
    const companyId = profileRes[0]?.company_id;

    const isGroup = existingTask[0].company_id !== null;

    if (!isGroup && existingTask[0].profile_id !== profileId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    } else if (isGroup && existingTask[0].company_id !== companyId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    let updatedDeadline = existingTask[0].deadline;
    if (date !== undefined || time !== undefined) {
      const fallbackD = existingTask[0].deadline ? new Date(existingTask[0].deadline) : new Date();
      const d = date !== undefined ? date : fallbackD.toISOString().split("T")[0];
      const t = time !== undefined ? time : fallbackD.toISOString().split("T")[1].substring(0, 5);
      updatedDeadline = new Date(`${d}T${t}:00Z`);
    }

    const [updatedTask] = await db
      .update(tasks)
      .set({
        title: title !== undefined ? title : existingTask[0].title,
        deadline: updatedDeadline,
        notes: note !== undefined ? note : existingTask[0].notes,
        is_completed: completed !== undefined ? completed : existingTask[0].is_completed,
        updated_at: new Date(),
        updated_by: profileId
      })
      .where(eq(tasks.id, taskId))
      .returning();

    const rd = updatedTask.deadline ? new Date(updatedTask.deadline) : null;
    res.json({
      id: updatedTask.id,
      title: updatedTask.title,
      date: rd ? rd.toISOString().split("T")[0] : null,
      time: rd ? rd.toISOString().split("T")[1].substring(0, 5) : "00:00",
      note: updatedTask.notes || "",
      completed: updatedTask.is_completed,
      type: updatedTask.company_id ? "group" : "personal",
      created_at: updatedTask.created_at
    });
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

    const taskId = String(req.params.id);

    const existingTask = await db.select().from(tasks).where(eq(tasks.id, taskId));

    if (existingTask.length === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const profileRes = await db.select().from(profiles).where(eq(profiles.id, profileId));
    const companyId = profileRes[0]?.company_id;

    const isGroup = existingTask[0].company_id !== null;

    if (!isGroup && existingTask[0].profile_id !== profileId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    } else if (isGroup && existingTask[0].company_id !== companyId) {
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
