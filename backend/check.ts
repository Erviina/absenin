import { db } from './src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  const res = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
  console.log(res.rows);
  
  // also check if 'users' table exists
  const res2 = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'`);
  console.log("users table columns:", res2.rows);

  const res3 = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'auth.users'`);
  console.log("auth.users table columns:", res3.rows);
}
run();
