import { db } from "../db";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function inspect() {
  try {
    console.log("=== AGENDAS TABLE (ALL, max 20) ===");
    const agendas = await db.execute(sql`
      SELECT id, title, type, company_id, profile_id, start_time, end_time, deleted_at, is_all_day
      FROM agendas
      LIMIT 20
    `);
    console.log("Total rows:", agendas.rows.length);
    agendas.rows.forEach((r: any, i: number) => {
      console.log(`[${i}]`, JSON.stringify({
        id: r.id,
        title: r.title,
        type: r.type,
        company_id: r.company_id,
        profile_id: r.profile_id,
        start_time: r.start_time,
        end_time: r.end_time,
        deleted_at: r.deleted_at,
        is_all_day: r.is_all_day
      }));
    });

    console.log("\n=== COMPANIES ===");
    const companies = await db.execute(sql`SELECT id, name FROM companies LIMIT 5`);
    companies.rows.forEach((r: any) => {
      console.log(JSON.stringify({ id: r.id, name: r.name }));
    });

    console.log("\n=== COMPANY_MEMBERS (active, max 10) ===");
    const members = await db.execute(sql`
      SELECT cm.company_id, cm.profile_id, cm.role, cm.status, p.full_name
      FROM company_members cm
      JOIN profiles p ON p.id = cm.profile_id
      WHERE cm.deleted_at IS NULL AND cm.status = 'active'
      LIMIT 10
    `);
    members.rows.forEach((r: any) => {
      console.log(JSON.stringify({ company_id: r.company_id, profile_id: r.profile_id, role: r.role, name: r.full_name }));
    });

    console.log("\n=== COMPANY AGENDAS (type=COMPANY, not deleted) ===");
    const companyAgendas = await db.execute(sql`
      SELECT id, title, type, company_id, profile_id, start_time, end_time, deleted_at
      FROM agendas
      WHERE type = 'COMPANY' AND deleted_at IS NULL
      LIMIT 10
    `);
    console.log("Company-type agendas:", companyAgendas.rows.length);
    companyAgendas.rows.forEach((r: any) => {
      console.log(JSON.stringify({ id: r.id, title: r.title, company_id: r.company_id, start: r.start_time, end: r.end_time }));
    });

    console.log("\n=== AGENDAS CURRENT MONTH (Oct 2026) ===");
    const oct = await db.execute(sql`
      SELECT id, title, type, company_id, profile_id, start_time, end_time, deleted_at
      FROM agendas
      WHERE start_time >= '2026-10-01' AND start_time <= '2026-10-31 23:59:59'
        AND deleted_at IS NULL
      LIMIT 10
    `);
    console.log("October 2026 agendas:", oct.rows.length);
    oct.rows.forEach((r: any) => {
      console.log(JSON.stringify({ id: r.id, title: r.title, type: r.type, start: r.start_time }));
    });

  } catch (err) {
    console.error("Inspect error:", err);
  }
  process.exit(0);
}

inspect();
