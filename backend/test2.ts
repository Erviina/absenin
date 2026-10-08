import { db } from './src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const res = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks'`);
    console.log(res.rows);
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}
run();
