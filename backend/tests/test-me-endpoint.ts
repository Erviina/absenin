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

  console.log("Token generated:", token);

  const res = await fetch("http://localhost:3003/api/auth/me", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Response:", JSON.stringify(data, null, 2));
}

runTest().catch(console.error);
