import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const profilesRes = await db.execute(sql`
      SELECT id, full_name, email, company_id 
      FROM profiles 
      ORDER BY updated_at DESC LIMIT 10;
    `);
    console.log("Profiles:", profilesRes.rows);

    const membersRes = await db.execute(sql`
      SELECT cm.id, cm.company_id, cm.profile_id, cm.role, cm.status, cm.deleted_at, c.name as comp_name, p.full_name
      FROM company_members cm
      JOIN companies c ON c.id = cm.company_id
      JOIN profiles p ON p.id = cm.profile_id
      ORDER BY cm.created_at DESC;
    `);
    console.log("Company Members:", membersRes.rows);

    process.exit(0);
  } catch (err) {
    console.error("Query failed:", err);
    process.exit(1);
  }
}

run();
