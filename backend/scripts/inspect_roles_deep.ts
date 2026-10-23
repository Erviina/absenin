import dotenv from "dotenv";
dotenv.config();

import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("=== 1. Distinct roles in profile_roles ===");
  const prRoles = await db.execute(sql`SELECT DISTINCT role, COUNT(*) as count FROM profile_roles GROUP BY role`);
  console.log(prRoles.rows);

  console.log("\n=== 2. Distinct roles in company_members ===");
  const cmRoles = await db.execute(sql`SELECT DISTINCT role, COUNT(*) as count FROM company_members GROUP BY role`);
  console.log(cmRoles.rows);

  console.log("\n=== 3. Users with multiple profile_roles ===");
  const multiPR = await db.execute(sql`
    SELECT p.id, p.email, array_agg(pr.role) as pr_roles, cm.role as cm_role, cm.company_id, c.name as company_name
    FROM profiles p
    JOIN profile_roles pr ON pr.profile_id = p.id
    LEFT JOIN company_members cm ON cm.profile_id = p.id AND cm.status = 'active' AND cm.deleted_at IS NULL
    LEFT JOIN companies c ON c.id = cm.company_id
    GROUP BY p.id, p.email, cm.role, cm.company_id, c.name
    HAVING COUNT(DISTINCT pr.role) > 1
    LIMIT 10
  `);
  console.log(multiPR.rows);

  console.log("\n=== 4. Users with multi-company ===");
  const multiComp = await db.execute(sql`
    SELECT p.id, p.email, COUNT(DISTINCT cm.company_id) as comp_count,
           json_agg(json_build_object('company_id', cm.company_id, 'company_name', c.name, 'role', cm.role)) as memberships
    FROM profiles p
    JOIN company_members cm ON cm.profile_id = p.id AND cm.status = 'active' AND cm.deleted_at IS NULL
    JOIN companies c ON c.id = cm.company_id
    GROUP BY p.id, p.email
    HAVING COUNT(DISTINCT cm.company_id) > 1
    LIMIT 5
  `);
  console.log(JSON.stringify(multiComp.rows, null, 2));

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
