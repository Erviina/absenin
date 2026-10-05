import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function checkData() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    const res = await pool.query(`
      SELECT p.id, p.full_name, p.company_id, pr.role
      FROM profiles p
      LEFT JOIN profile_roles pr ON pr.profile_id = p.id
    `);
    
    console.table(res.rows);

    const compRes = await pool.query(`SELECT id, name FROM companies`);
    console.table(compRes.rows);
  } catch (error: any) {
    console.error("Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkData();
