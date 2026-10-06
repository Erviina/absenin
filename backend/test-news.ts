import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

async function testNews() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    // 1. Get a user with a company_id
    const res = await pool.query(`
      SELECT id, email, full_name, company_id
      FROM profiles
      WHERE company_id IS NOT NULL
      LIMIT 1;
    `);
    
    if (res.rows.length === 0) {
      console.log("No user with company_id found");
      return;
    }
    
    const user = res.rows[0];
    console.log("Found user:", user.email);
    
    // 2. Generate token
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: "authenticated",
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );
    
    const express = (await import('express')).default;
    const newsRoutes = (await import('./src/routes/news')).default;
    
    const app = express();
    app.use(express.json());
    app.use("/api/news", newsRoutes);
    
    const server = app.listen(3005, async () => {
      console.log("Test server listening on port 3005");
      
      const response = await fetch("http://localhost:3005/api/news", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log("Status Code:", response.status);
      console.log("Response JSON:");
      console.log(JSON.stringify(data, null, 2));
      
      server.close();
      await pool.end();
    });
    
  } catch (error: any) {
    console.error("Error:", error);
    await pool.end();
  }
}

testNews();
