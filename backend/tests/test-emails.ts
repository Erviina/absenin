import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function checkEmails() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;
  const pool = new Pool({ connectionString });
  
  try {
    const res = await pool.query(`SELECT id, email, company_id FROM profiles`);
    console.table(res.rows);
  } catch (error: any) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

checkEmails();
