import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const cjr = await db.execute(sql`SELECT * FROM company_join_requests ORDER BY created_at DESC LIMIT 5`);
    console.log("Recent company_join_requests:", cjr.rows);

    const cer = await db.execute(sql`SELECT * FROM company_exit_requests ORDER BY created_at DESC LIMIT 5`);
    console.log("Recent company_exit_requests:", cer.rows);

    process.exit(0);
  } catch (err) {
    console.error("Error inspecting data:", err);
    process.exit(1);
  }
}

run();
