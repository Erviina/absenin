import { sql } from "drizzle-orm";
import { db } from "./src/db";

async function test() {
  try {
    const arrayLiteral = "{Senin,Selasa}";
    const q = sql`UPDATE companies SET work_days = ${arrayLiteral}::text[] WHERE id = '6df0cf04-d7d8-4e89-a2e0-2d8544efd737' RETURNING *`;
    const res = await db.execute(q);
    console.log(res.rows[0]);
  } catch(e) {
    console.log("ERROR:", e.message);
  }
}
test();
