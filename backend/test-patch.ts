import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

async function runTest() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("No secret");

  // Create token for Ervina (Admin)
  const token = jwt.sign(
    {
      sub: '5c59fdd5-d5d1-48c0-961f-76d7892a546a',
      email: 'ervinaanakbaik@gmail.com',
      role: 'authenticated'
    },
    secret,
    { expiresIn: "7d" }
  );

  console.log("=== TEST 1: PATCH /api/profile (Update Name) ===");
  const res1 = await fetch("http://localhost:3004/api/profile", {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      full_name: "Nama Test Profile"
    })
  });
  const data1 = await res1.json();
  console.log("Status:", res1.status);
  console.log("Response:", JSON.stringify(data1, null, 2));

  console.log("\n=== TEST 2: GET /api/auth/me (Verify) ===");
  const res2 = await fetch("http://localhost:3004/api/auth/me", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  const data2 = await res2.json();
  console.log("Status:", res2.status);
  console.log("Response:", JSON.stringify(data2, null, 2));

  console.log("\n=== TEST 3: PATCH /api/profile (Forbidden field) ===");
  const res3 = await fetch("http://localhost:3004/api/profile", {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: "test@example.com"
    })
  });
  const data3 = await res3.json();
  console.log("Status:", res3.status);
  console.log("Response:", JSON.stringify(data3, null, 2));
}

runTest().catch(console.error);
