import { Request } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

export interface TenantContext {
  companyId: string;
  role: "owner" | "admin" | "manager" | "member";
  isManagement: boolean;
}

export async function resolveTenant(
  req: Request,
  userId: string
): Promise<TenantContext | null> {
  const headerCompanyId = req.headers["x-company-id"] as string | undefined;
  const queryCompanyId = req.query.company_id as string | undefined;
  const bodyCompanyId = req.body?.company_id as string | undefined;
  const rawRequested = headerCompanyId || queryCompanyId || bodyCompanyId;
  const requestedCompanyId = (rawRequested && rawRequested !== "undefined" && rawRequested !== "null" && rawRequested.trim() !== "") 
    ? rawRequested.trim() 
    : undefined;

  // 1. If explicit companyId is specified, check membership in company_members
  if (requestedCompanyId) {
    const memRes = await db.execute(sql`
      SELECT company_id, role, status
      FROM company_members
      WHERE profile_id = ${userId}
        AND company_id = ${requestedCompanyId}
        AND status = 'active'
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (memRes.rows.length > 0) {
      const rawRole = (memRes.rows[0].role as string || "member").toLowerCase();
      let role: TenantContext["role"] = "member";
      if (rawRole === "owner") role = "owner";
      else if (rawRole === "admin") role = "admin";
      else if (rawRole === "manager") role = "manager";

      return {
        companyId: requestedCompanyId,
        role,
        isManagement: ["owner", "admin", "manager"].includes(role),
      };
    }

    // Check if user is the company creator (legacy support)
    const ownerCheck = await db.execute(sql`
      SELECT id FROM companies WHERE id = ${requestedCompanyId} AND created_by = ${userId} AND deleted_at IS NULL LIMIT 1
    `);
    if (ownerCheck.rows.length > 0) {
      return {
        companyId: requestedCompanyId,
        role: "owner",
        isManagement: true,
      };
    }

    // If explicit company was requested but user is not an active member, deny cross-tenant access
    return null;
  }

  // 2. Look for user's primary/active membership in company_members
  const activeMemRes = await db.execute(sql`
    SELECT company_id, role
    FROM company_members
    WHERE profile_id = ${userId}
      AND status = 'active'
      AND deleted_at IS NULL
    ORDER BY joined_at DESC
    LIMIT 1
  `);

  if (activeMemRes.rows.length > 0) {
    const row = activeMemRes.rows[0];
    const cid = row.company_id as string;
    const rawRole = (row.role as string || "member").toLowerCase();
    let role: TenantContext["role"] = "member";
    if (rawRole === "owner") role = "owner";
    else if (rawRole === "admin") role = "admin";
    else if (rawRole === "manager") role = "manager";

    // Keep profiles.company_id in sync if different
    db.execute(sql`
      UPDATE profiles SET company_id = ${cid} WHERE id = ${userId} AND (company_id IS NULL OR company_id != ${cid})
    `).catch(console.error);

    return {
      companyId: cid,
      role,
      isManagement: ["owner", "admin", "manager"].includes(role),
    };
  }

  // 3. Fallback to legacy profiles.company_id (only if valid and not inactive/deleted)
  const profileRes = await db.execute(sql`
    SELECT company_id FROM profiles WHERE id = ${userId} AND deleted_at IS NULL
  `);

  if (profileRes.rows.length > 0 && profileRes.rows[0].company_id) {
    const cid = profileRes.rows[0].company_id as string;

    // Verify user is NOT inactive or deleted in company_members for this company
    const memCheck = await db.execute(sql`
      SELECT status, deleted_at FROM company_members
      WHERE profile_id = ${userId} AND company_id = ${cid}
      LIMIT 1
    `);

    // If there is any membership record that is inactive or deleted, user was removed/exited!
    if (memCheck.rows.length > 0) {
      const m = memCheck.rows[0];
      if (m.status !== "active" || m.deleted_at !== null) {
        // Clear stale profiles.company_id
        await db.execute(sql`UPDATE profiles SET company_id = NULL WHERE id = ${userId}`);
        return null;
      }
    } else {
      // User has no company_members row for this company. If the user has other company_members records,
      // this legacy profiles.company_id is stale and should be cleared.
      const anyMemberRes = await db.execute(sql`
        SELECT id FROM company_members WHERE profile_id = ${userId} LIMIT 1
      `);
      if (anyMemberRes.rows.length > 0) {
        await db.execute(sql`UPDATE profiles SET company_id = NULL WHERE id = ${userId}`);
        return null;
      }
    }

    // Role check: Only assign owner if creator, otherwise default to member (prevents cross-company role leakage)
    const ownerCheck = await db.execute(sql`
      SELECT id FROM companies WHERE id = ${cid} AND created_by = ${userId} LIMIT 1
    `);
    const role: TenantContext["role"] = ownerCheck.rows.length > 0 ? "owner" : "member";

    return {
      companyId: cid,
      role,
      isManagement: ["owner", "admin", "manager"].includes(role),
    };
  }

  return null;
}
