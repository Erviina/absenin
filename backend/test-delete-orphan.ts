import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function deleteOrphan() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  const email = "dumpme1105@gmail.com";

  try {
    // 1. Check existing
    const checkRes = await pool.query(
      `SELECT id, email FROM public.profiles WHERE email = $1`,
      [email]
    );
    
    console.log("Found rows to delete:");
    console.table(checkRes.rows);

    if (checkRes.rows.length === 1) {
      // 2. Delete
      const delRes = await pool.query(
        `DELETE FROM public.profiles WHERE email = $1 RETURNING id, email`,
        [email]
      );
      
      console.log("Deleted rows:");
      console.table(delRes.rows);

      // 3. Verify
      const verifyRes = await pool.query(
        `SELECT id, email FROM public.profiles WHERE email = $1`,
        [email]
      );
      console.log("Rows remaining after delete:", verifyRes.rows.length);
    } else {
      console.log(`Expected 1 row but found ${checkRes.rows.length}. Aborting.`);
    }

  } catch (error) {
    console.error("Query Error:", error);
  } finally {
    await pool.end();
  }
}

deleteOrphan();
