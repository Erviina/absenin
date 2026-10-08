import { db } from './src/db/index';
import { sql } from 'drizzle-orm';
import { profiles, tasks } from './src/db/schema';
import crypto from 'crypto';

async function run() {
  try {
    const res = await db.execute(sql`SELECT id FROM profiles LIMIT 1`);
    if (res.rows.length === 0) {
      console.log('No profiles found');
      return;
    }
    const profileId = res.rows[0].id as string;
    console.log('Using profile ID:', profileId);

    const [newTask] = await db
      .insert(tasks)
      .values({
        id: crypto.randomUUID(),
        profile_id: profileId,
        company_id: null,
        title: 'Test',
        date: '2026-10-08',
        time: '10:00',
        note: '',
        type: 'personal',
        completed: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    console.log('Task inserted:', newTask);
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}
run();
