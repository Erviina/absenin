import { db } from "./src/db";
import { sql } from "drizzle-orm";
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || "supersecret";

async function run() {
  try {
    const adminRows = await db.execute(sql`SELECT p.id, p.email, p.company_id FROM profiles p JOIN profile_roles pr ON pr.profile_id = p.id WHERE pr.role = 'Admin' LIMIT 1`);
    const managerRows = await db.execute(sql`SELECT p.id, p.email, p.company_id FROM profiles p JOIN profile_roles pr ON pr.profile_id = p.id WHERE pr.role = 'Manager' LIMIT 1`);
    const employeeRows = await db.execute(sql`SELECT p.id, p.email, p.company_id FROM profiles p JOIN profile_roles pr ON pr.profile_id = p.id WHERE pr.role = 'Employee' LIMIT 1`);

    const admin = adminRows.rows[0];
    const manager = managerRows.rows[0];
    const employee = employeeRows.rows[0];

    console.log("Admin:", admin);
    console.log("Manager:", manager);
    console.log("Employee:", employee);

    const testEndpoint = async (user: any, name: string) => {
      if (!user) return console.log(`No user found for ${name}`);
      const token = jwt.sign({ sub: user.id, email: user.email }, secret, { expiresIn: '1h' });
      
      const res = await fetch("http://localhost:3000/api/companies/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: `Perusahaan ${name} Updated` })
      });
      
      const data = await res.json();
      console.log(`Test PATCH /me with ${name}:`, res.status, data);
    };

    await testEndpoint(admin, "Admin");
    await testEndpoint(manager, "Manager");
    await testEndpoint(employee, "Employee");
    
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

run();
