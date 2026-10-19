import { Client } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log("Setting column defaults on companies table...");
  await client.query(`
    ALTER TABLE "companies" ALTER COLUMN "work_start_time" SET DEFAULT '08:00:00'::time;
    ALTER TABLE "companies" ALTER COLUMN "work_end_time" SET DEFAULT '17:00:00'::time;
    ALTER TABLE "companies" ALTER COLUMN "work_days" SET DEFAULT ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[];
  `);
  console.log("Column defaults set successfully.");

  console.log("Updating existing companies with NULL operational hours...");
  const updateRes = await client.query(`
    UPDATE companies 
    SET 
      work_start_time = COALESCE(work_start_time, '08:00:00'::time),
      work_end_time = COALESCE(work_end_time, '17:00:00'::time),
      work_days = COALESCE(work_days, ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[])
    WHERE work_start_time IS NULL 
       OR work_end_time IS NULL 
       OR work_days IS NULL
    RETURNING id, name, work_start_time, work_end_time, work_days;
  `);

  console.log(`Updated ${updateRes.rowCount} companies.`);
  console.table(updateRes.rows);

  console.log("Verifying all companies:");
  const allRes = await client.query(`
    SELECT id, name, work_days, work_start_time, work_end_time
    FROM companies
    ORDER BY created_at DESC
  `);
  console.table(allRes.rows);

  await client.end();
}

run().catch(console.error);
