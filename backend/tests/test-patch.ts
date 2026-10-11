import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const payload = {
        title: "Senam Pagi",
        notes: "sadsad",
        start_time: new Date("2026-10-09T01:00:00").toISOString(),
        end_time: new Date("2026-10-09T02:00:00").toISOString(),
        agenda_category_id: "95a7fd20-a932-46ad-9c08-365d7a0532e5"
    };

    const agendaId = "ff3c7f2c-ba58-4c50-80ed-4ecab75a19b2";
    const profileId = "5049b6d0-e0f2-4525-8c60-3732f78c0bd9";
    
    console.log("Updating...");
    const updateRes = await db.execute(sql`
      UPDATE agendas 
      SET 
        title = ${payload.title},
        notes = ${payload.notes || null},
        start_time = ${payload.start_time},
        end_time = ${payload.end_time},
        agenda_category_id = ${payload.agenda_category_id || null},
        updated_at = NOW(),
        updated_by = ${profileId}
      WHERE id = ${agendaId}
      RETURNING *
    `);
    console.log("Update success:", updateRes.rows);

  } catch(e: any) {
    console.error("Error:", e);
  }
  process.exit(0);
}
main();
