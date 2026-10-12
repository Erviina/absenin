import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const nowIso = new Date().toISOString();
    const updateRes = await db.execute(sql`
      UPDATE company_members
      SET status = 'inactive', deleted_at = ${nowIso}
      WHERE company_id = '5970910a-aab9-44ae-9e58-9a7220ee774a'
        AND profile_id = '76b0914c-d6d5-4a8d-981a-9d1050468812'
      RETURNING *;
    `);
    console.log("Update result:", updateRes.rows);

    process.exit(0);
  } catch (err) {
    console.error("Test update failed:", err);
    process.exit(1);
  }
}

run();
