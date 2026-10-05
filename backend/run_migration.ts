import { db } from './src/db/index';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function run() {
  try {
    const migration = fs.readFileSync('./src/db/migrations/0000_salty_jack_flag.sql', 'utf8');
    await db.execute(sql.raw(migration));
    console.log("Migration applied successfully!");
    
    // Verify
    const verify = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'companies' AND column_name = 'join_code';
    `);
    console.log("Verification result:", verify.rows);
  } catch (err) {
    console.error("Migration failed:", err);
  }
}
run();
