import { sql } from "drizzle-orm";
try {
  const updates = [];
  sql.join(updates, sql`, `);
  console.log("Empty updates array works");
} catch(e) {
  console.log(e.message);
}
