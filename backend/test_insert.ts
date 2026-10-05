import { db } from './src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  const email = 'test_auth_insert2_' + Date.now() + '@example.com';
  const fullName = 'Test User Updated';
  const avatarUrl = 'http://example.com/avatar.jpg';
  try {
    const newIdRes = await db.execute(sql`SELECT gen_random_uuid() as id`);
    const newId = newIdRes.rows[0].id as string;

    await db.execute(sql`
      INSERT INTO auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data)
      VALUES (${newId}, ${email}, 'authenticated', 'authenticated', '{}', '{}')
    `);
    console.log("Success auth.users insert");

    const updateResult = await db.execute(sql`
      UPDATE profiles 
      SET full_name = ${fullName}, avatar_url = ${avatarUrl}, updated_at = now()
      WHERE id = ${newId}
      RETURNING *
    `);
    console.log("Success profiles update:", updateResult.rows[0]);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
