import { Router, Request, Response } from "express";
import { db } from "../db";
import { tasks, profiles, notifications } from "../db/schema";
import { eq, desc, or, and, isNull } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import crypto from "crypto";
import { resolveTenant } from "../utils/tenant";

const router = Router();

// Helper to notify assignees safely
async function notifyAssignees(
  companyId: string,
  assignees: any[],
  creatorId: string,
  taskId: string,
  taskTitle: string,
  existingAssigneeIds: Set<string> = new Set()
) {
  try {
    if (!companyId || !Array.isArray(assignees) || assignees.length === 0) return;

    const [creator] = await db
      .select({ full_name: profiles.full_name })
      .from(profiles)
      .where(eq(profiles.id, creatorId))
      .limit(1);

    const senderName = creator?.full_name || "Rekan kerja Anda";

    for (const assignee of assignees) {
      const recipientId = typeof assignee === "string" ? assignee : assignee?.id;
      if (!recipientId || recipientId === creatorId || existingAssigneeIds.has(recipientId)) {
        continue;
      }

      await db.insert(notifications).values({
        company_id: companyId,
        recipient_id: recipientId,
        type: "TASK_ASSIGNED",
        title: "Tugas Baru Ditugaskan",
        message: `${senderName} menugaskan tugas "${taskTitle}" kepada Anda.`,
        reference_id: taskId,
        is_read: false,
      });
    }
  } catch (err) {
    console.error("Failed to notify assignees:", err);
  }
}

// Get all tasks for the current user (personal) and their company (group)
router.get("/", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const profileId = (req as any).user?.id;
    if (!profileId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const tenant = await resolveTenant(req, profileId);
    const companyId = tenant?.companyId || (req.headers["x-company-id"] as string) || null;

    // Filter tasks based on company:
    // If companyId is present, strictly fetch tasks for this active company.
    // If no companyId, fetch tasks where company_id is null.
    const companyCondition = companyId 
      ? eq(tasks.company_id, String(companyId)) 
      : isNull(tasks.company_id);

    const allCompanyTasks = await db.select().from(tasks)
      .where(and(companyCondition, isNull(tasks.deleted_at)))
      .orderBy(desc(tasks.created_at));

    // Visible tasks rule:
    // 1. Personal tasks: ONLY visible to creator (profile_id === profileId)
    // 2. Group tasks: ONLY visible to creator OR persons mentioned in assignees / assigned_to
    const visibleTasks = allCompanyTasks.filter(t => {
      const isCreator = t.profile_id === profileId || t.created_by === profileId;
      const isGroup = t.type === "group" || (!t.type && Array.isArray(t.assignees) && t.assignees.length > 0);

      if (isGroup) {
        if (isCreator) return true;
        if (t.assigned_to === profileId) return true;
        if (Array.isArray(t.assignees)) {
          return t.assignees.some((a: any) => (typeof a === "string" ? a === profileId : a?.id === profileId));
        }
        return false;
      } else {
        return isCreator;
      }
    });

    const formattedTasks = visibleTasks.map(t => {
      const d = t.deadline ? new Date(t.deadline) : null;
      const isGroup = t.type === "group" || (!t.type && Array.isArray(t.assignees) && t.assignees.length > 0);
      return {
        id: t.id,
        title: t.title,
        date: d ? d.toISOString().split("T")[0] : null,
        time: d ? d.toISOString().split("T")[1].substring(0, 5) : "00:00",
        note: t.notes || "",
        completed: t.is_completed,
        type: t.type || (isGroup ? "group" : "personal"),
        company_id: t.company_id,
        assignees: t.assignees || [],
        assigned_to: t.assigned_to || null,
        created_at: t.created_at,
        created_by: t.created_by || t.profile_id
      };
    });

    res.json(formattedTasks);
  } catch (error: any) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get single task by ID
router.get("/:id", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const profileId = (req as any).user?.id;
    if (!profileId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const taskId = String(req.params.id);
    const existingTask = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), isNull(tasks.deleted_at)));

    if (existingTask.length === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const t = existingTask[0];
    const isGroup = t.type === "group" || (!t.type && Array.isArray(t.assignees) && t.assignees.length > 0);
    const isCreator = t.profile_id === profileId || t.created_by === profileId;
    let isAssignee = false;
    if (Array.isArray(t.assignees)) {
      isAssignee = t.assignees.some((a: any) => (typeof a === "string" ? a === profileId : a?.id === profileId));
    }
    if (t.assigned_to === profileId) {
      isAssignee = true;
    }

    if (isGroup) {
      if (!isCreator && !isAssignee) {
        res.status(403).json({ error: "Forbidden: Anda tidak memiliki akses ke tugas grup ini" });
        return;
      }
    } else {
      if (!isCreator) {
        res.status(403).json({ error: "Forbidden: Anda tidak memiliki akses ke tugas personal ini" });
        return;
      }
    }

    const d = t.deadline ? new Date(t.deadline) : null;
    res.json({
      id: t.id,
      title: t.title,
      date: d ? d.toISOString().split("T")[0] : null,
      time: d ? d.toISOString().split("T")[1].substring(0, 5) : "00:00",
      note: t.notes || "",
      completed: t.is_completed,
      type: t.type || (isGroup ? "group" : "personal"),
      company_id: t.company_id,
      assignees: t.assignees || [],
      assigned_to: t.assigned_to || null,
      created_at: t.created_at,
      created_by: t.created_by || t.profile_id
    });
  } catch (error: any) {
    console.error("Error fetching task details:", error);
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

    const { title, date, time, note, type, assignees, assigned_to } = req.body;

    if (!title) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    const tenant = await resolveTenant(req, profileId);
    const targetCompanyId = tenant?.companyId || (req.headers["x-company-id"] as string) || req.body.company_id || null;

    const taskType = type === "group" ? "group" : "personal";

    if (taskType === "group" && !targetCompanyId) {
      res.status(400).json({ error: "Cannot create group task: No active company associated" });
      return;
    }

    const deadlineStr = `${date || new Date().toISOString().split("T")[0]}T${time || "00:00"}:00Z`;
    const deadline = new Date(deadlineStr);

    const safeAssignees = Array.isArray(assignees) ? assignees : [];
    const safeAssignedTo =
      assigned_to ||
      (safeAssignees[0] ? (typeof safeAssignees[0] === "string" ? safeAssignees[0] : safeAssignees[0].id) : null);

    const [newTask] = await db
      .insert(tasks)
      .values({
        id: crypto.randomUUID(),
        profile_id: profileId,
        company_id: targetCompanyId ? String(targetCompanyId) : null,
        title,
        deadline,
        notes: note || null,
        is_completed: false,
        type: taskType,
        assignees: safeAssignees,
        assigned_to: safeAssignedTo,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: profileId
      })
      .returning();

    // Send notifications to assignees for group tasks
    if (targetCompanyId && safeAssignees.length > 0) {
      await notifyAssignees(String(targetCompanyId), safeAssignees, profileId, newTask.id, newTask.title || "Tugas Baru");
    }

    const d = newTask.deadline ? new Date(newTask.deadline) : null;
    res.status(201).json({
      id: newTask.id,
      title: newTask.title,
      date: d ? d.toISOString().split("T")[0] : null,
      time: d ? d.toISOString().split("T")[1].substring(0, 5) : "00:00",
      note: newTask.notes || "",
      completed: newTask.is_completed,
      type: newTask.type || taskType,
      company_id: newTask.company_id,
      assignees: newTask.assignees || [],
      assigned_to: newTask.assigned_to || null,
      created_at: newTask.created_at,
      created_by: newTask.created_by || newTask.profile_id
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
    const { title, date, time, note, completed, assignees, assigned_to } = req.body;

    const existingTask = await db.select().from(tasks).where(eq(tasks.id, taskId));

    if (existingTask.length === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const currentTask = existingTask[0];
    const isGroup = currentTask.type === "group" || (!currentTask.type && Array.isArray(currentTask.assignees) && currentTask.assignees.length > 0);
    const isCreator = currentTask.profile_id === profileId || currentTask.created_by === profileId;
    let isAssignee = false;
    if (Array.isArray(currentTask.assignees)) {
      isAssignee = currentTask.assignees.some((a: any) => (typeof a === "string" ? a === profileId : a?.id === profileId));
    }
    if (currentTask.assigned_to === profileId) {
      isAssignee = true;
    }

    if (isGroup) {
      if (!isCreator && !isAssignee) {
        res.status(403).json({ error: "Forbidden: Anda tidak memiliki akses ke tugas ini" });
        return;
      }
    } else {
      if (!isCreator) {
        res.status(403).json({ error: "Forbidden: Anda tidak dapat mengubah tugas personal orang lain" });
        return;
      }
    }

    let updatedDeadline = currentTask.deadline;
    if (date !== undefined || time !== undefined) {
      const fallbackD = currentTask.deadline ? new Date(currentTask.deadline) : new Date();
      const d = date !== undefined ? date : fallbackD.toISOString().split("T")[0];
      const t = time !== undefined ? time : fallbackD.toISOString().split("T")[1].substring(0, 5);
      updatedDeadline = new Date(`${d}T${t}:00Z`);
    }

    const updateData: any = {
      title: title !== undefined ? title : currentTask.title,
      deadline: updatedDeadline,
      notes: note !== undefined ? note : currentTask.notes,
      is_completed: completed !== undefined ? completed : currentTask.is_completed,
      updated_at: new Date(),
      updated_by: profileId
    };

    let newAssigneesToNotify: any[] = [];
    if (assignees !== undefined) {
      const safeAssignees = Array.isArray(assignees) ? assignees : [];
      updateData.assignees = safeAssignees;
      updateData.assigned_to =
        assigned_to !== undefined
          ? assigned_to
          : (safeAssignees[0] ? (typeof safeAssignees[0] === "string" ? safeAssignees[0] : safeAssignees[0].id) : null);

      newAssigneesToNotify = safeAssignees;
    } else if (assigned_to !== undefined) {
      updateData.assigned_to = assigned_to;
    }

    const [updatedTask] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    // Send notifications to newly added assignees
    if (currentTask.company_id && newAssigneesToNotify.length > 0) {
      const oldAssigneeIds = new Set(
        Array.isArray(currentTask.assignees)
          ? currentTask.assignees.map((a: any) => (typeof a === "string" ? a : a?.id))
          : []
      );
      await notifyAssignees(
        currentTask.company_id,
        newAssigneesToNotify,
        profileId,
        updatedTask.id,
        updatedTask.title || "Tugas Baru",
        oldAssigneeIds
      );
    }

    const rd = updatedTask.deadline ? new Date(updatedTask.deadline) : null;
    res.json({
      id: updatedTask.id,
      title: updatedTask.title,
      date: rd ? rd.toISOString().split("T")[0] : null,
      time: rd ? rd.toISOString().split("T")[1].substring(0, 5) : "00:00",
      note: updatedTask.notes || "",
      completed: updatedTask.is_completed,
      type: updatedTask.type || (isGroup ? "group" : "personal"),
      company_id: updatedTask.company_id,
      assignees: updatedTask.assignees || [],
      assigned_to: updatedTask.assigned_to || null,
      created_at: updatedTask.created_at,
      created_by: updatedTask.created_by || updatedTask.profile_id
    });
  } catch (error: any) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete a task (Soft delete)
router.delete("/:id", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const profileId = (req as any).user?.id;
    if (!profileId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const taskId = String(req.params.id);

    const existingTask = await db.select().from(tasks).where(and(eq(tasks.id, taskId), isNull(tasks.deleted_at)));

    if (existingTask.length === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const isCreator = existingTask[0].profile_id === profileId || existingTask[0].created_by === profileId;

    if (!isCreator) {
      res.status(403).json({ error: "Forbidden: Hanya pembuat tugas yang dapat menghapus tugas ini" });
      return;
    }

    await db.update(tasks).set({ deleted_at: new Date(), updated_at: new Date() }).where(eq(tasks.id, taskId));

    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
