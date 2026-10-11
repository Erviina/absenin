import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function main() {
  const cats = await db.execute(sql`SELECT * FROM agendas_categories`);
  console.log("Categories:", cats.rows);
  const agendas = await db.execute(sql`SELECT * FROM agendas ORDER BY created_at DESC LIMIT 5`);
  console.log("Agendas:", agendas.rows);
  process.exit(0);
}
main();
