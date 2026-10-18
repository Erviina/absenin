import { db } from "../src/db";
import { sql } from "drizzle-orm";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "absenin-super-secret-key-123456";

async function main() {
  console.log("=== CHECKING ROLES & MEMBERSHIPS IN DATABASE ===");
  const membersRes = await db.execute(sql`
    SELECT cm.company_id, cm.profile_id, cm.role, p.email, p.full_name
    FROM company_members cm
    JOIN profiles p ON p.id = cm.profile_id
    WHERE cm.status = 'active' AND cm.deleted_at IS NULL
    ORDER BY cm.company_id, cm.role
    LIMIT 20
  `);

  console.log("Found active members:", membersRes.rows.length);
  const byRole: Record<string, any[]> = { owner: [], admin: [], manager: [], member: [] };
  for (const row of membersRes.rows) {
    const r = (row.role as string || "member").toLowerCase();
    if (byRole[r]) byRole[r].push(row);
  }

  console.log({
    owners: byRole.owner.length,
    admins: byRole.admin.length,
    managers: byRole.manager.length,
    members: byRole.member.length,
  });

  for (const [r, list] of Object.entries(byRole)) {
    if (list.length > 0) {
      console.log(`Sample ${r}:`, {
        profile_id: list[0].profile_id,
        email: list[0].email,
        company_id: list[0].company_id,
        role: list[0].role
      });
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
