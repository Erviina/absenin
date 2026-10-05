import { db } from './src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  const newId = 'a5fa94e2-8c2c-4273-8906-0fe37ab4626b';
  try {
    const res = await db.execute(sql`SELECT * FROM profiles WHERE id = ${newId}`);
    console.log("Created Profile:", res.rows[0]);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
