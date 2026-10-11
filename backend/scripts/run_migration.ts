import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const sql = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';";
  try {
    const res = await pool.query(sql);
    console.log("Tables:", res.rows.map(r => r.table_name));
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}

run();
