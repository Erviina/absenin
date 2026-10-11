import { sql } from "drizzle-orm";
import { db } from "./src/db";

async function run() {
  try {
    await db.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS avatar_company_url text;`);
    console.log("Done");
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
