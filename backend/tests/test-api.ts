import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const adminId = "5c59fdd5-d5d1-48c0-961f-76d7892a546a";
const email = "ervinaanakbaik@gmail.com";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET is not configured");
}

const accessToken = jwt.sign(
  {
    sub: adminId,
    email: email,
    role: "authenticated",
  },
  jwtSecret,
  { expiresIn: "7d" }
);

console.log("Token:", accessToken);

async function testApi() {
  const res = await fetch("http://localhost:3002/api/company/join-requests", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  const text = await res.text();
  console.log("Response:", text);
}

testApi();
