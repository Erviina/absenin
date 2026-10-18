import { Client } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const cols = await client.query(`
    SELECT column_name, data_type, udt_name, column_default, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'companies'
    ORDER BY ordinal_position
  `);
  console.log("=== COMPANIES COLUMNS ===");
  console.table(cols.rows);

  const companies = await client.query(`
    SELECT id, name, work_days, work_start_time, work_end_time, created_at
    FROM companies
    ORDER BY created_at DESC
  `);
  console.log("=== ALL COMPANIES DATA ===");
  console.table(companies.rows);

  await client.end();
}

run().catch(console.error);
