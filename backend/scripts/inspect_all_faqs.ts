import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  const res = await db.execute(sql`
    SELECT id, question, scope, content_scope, display_context, target_roles, content_type, category, is_published, deleted_at, needs_review 
    FROM faqs 
    ORDER BY created_at ASC;
  `);
  console.log("Total FAQs in DB:", res.rows.length);
  res.rows.forEach((r: any, idx: number) => {
    console.log(`[${idx + 1}] (${r.display_context} | ${r.content_scope} | ${r.scope}) [${(r.target_roles || []).join(", ")}] Q: ${r.question.slice(0, 45)}... pub:${r.is_published} del:${Boolean(r.deleted_at)}`);
  });
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
