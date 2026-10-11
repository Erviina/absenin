import { sql } from "drizzle-orm";
import { db } from "./src/db";

async function run() {
  try {
    const companyId = '6df0cf04-d7d8-4e89-a2e0-2d8544efd737'; // I'll just use a random uuid, doesn't matter if it exists, it'll just update 0 rows if it doesn't crash before that
    const work_days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
    const work_start_time = "08:00";
    const work_end_time = "17:00";

    const updates = [];
    if (work_days !== undefined) {
      if (Array.isArray(work_days)) {
        if (work_days.length > 0) {
          const arrayElements = work_days.map((d: string) => sql`${d}`);
          updates.push(sql`work_days = ARRAY[${sql.join(arrayElements, sql`, `)}]::text[]`);
        } else {
          updates.push(sql`work_days = ARRAY[]::text[]`);
        }
      }
    }
    if (work_start_time !== undefined) updates.push(sql`work_start_time = ${work_start_time}`);
    if (work_end_time !== undefined) updates.push(sql`work_end_time = ${work_end_time}`);

    console.log("updates array:", updates);

    const updateQuery = sql`
      UPDATE companies 
      SET ${sql.join(updates, sql`, `)}
      WHERE id = ${companyId}
      RETURNING *
    `;

    console.log("updateQuery:", updateQuery);

    const updateRes = await db.execute(updateQuery);
    console.log("Result rows:", updateRes.rows.length);
  } catch (error: any) {
    console.error("Test error:", error);
    console.error(error.stack);
  }
}

run();
