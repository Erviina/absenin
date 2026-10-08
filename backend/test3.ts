import { sql } from "drizzle-orm";
import { db } from "./src/db";

async function test() {
  const work_days = ["Senin", "Selasa"];
  const arrayElements = work_days.map(d => sql`${d}`);
  const q = sql`UPDATE companies SET work_days = ARRAY[${sql.join(arrayElements, sql`, `)}]::text[] WHERE id = '6df0cf04-d7d8-4e89-a2e0-2d8544efd737' RETURNING *`;
  
  // just log the query string that Drizzle generates
  console.log(q);
}
test();
