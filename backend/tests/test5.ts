import { db } from "./src/db";
import { sql } from "drizzle-orm";
import jwt from "jsonwebtoken";

async function run() {
  try {
    // get a user that is an admin of a company
    const res = await db.execute(sql`
      SELECT pr.profile_id, p.company_id 
      FROM profile_roles pr
      JOIN profiles p ON pr.profile_id = p.id
      WHERE pr.role = 'Admin' AND p.company_id IS NOT NULL
      LIMIT 1
    `);
    
    if (res.rows.length === 0) {
      console.log("No admin user found");
      return;
    }
    
    const user = res.rows[0];
    console.log("Found admin user:", user);
    
    const token = jwt.sign({ sub: user.profile_id }, "your_jwt_secret_here", { expiresIn: "1h" });
    console.log("Token:", token);
    
    // Now make the fetch request
    const payload = {
      work_days: "Senin",
      work_start_time: "08:00",
      work_end_time: "17:00"
    };
    
    console.log("Sending PATCH request...");
    const response = await fetch("http://localhost:3001/api/companies/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    console.log("Response:", data);
  } catch (error: any) {
    console.error("Test error:", error);
  }
}

run();
