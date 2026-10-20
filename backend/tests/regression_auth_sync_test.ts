import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import express from "express";
import authRoutes from "../src/routes/auth";
import companiesRoutes from "../src/routes/companies";

dotenv.config();

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET is missing");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/companies", companiesRoutes);

let server: any;

function createToken(profileId: string, email: string) {
  return jwt.sign(
    { sub: profileId, email, role: "authenticated" },
    secret as string,
    { expiresIn: "1h" }
  );
}

async function request(path: string, options: { token?: string; companyId?: string } = {}) {
  const headers: Record<string, string> = {};
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;
  if (options.companyId) headers["x-company-id"] = options.companyId;

  const res = await fetch(`http://127.0.0.1:4567${path}`, {
    method: "GET",
    headers
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runTests() {
  server = app.listen(4567);
  console.log("=== REGRESSION TEST: GOOGLE AUTH, ACTIVE COMPANY & ROLE SYNC ===\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string, extra?: any) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`, extra ? JSON.stringify(extra) : "");
      failed++;
    }
  }

  try {
    // Test 1: User with Employee role in active company
    // Ervina ('5c59fdd5-d5d1-48c0-961f-76d7892a546a') in PT. Mencari Cintanya Killa ('e93c532b-e52d-4486-a556-2d84838414d0') is 'member'
    const tokenErvina = createToken('5c59fdd5-d5d1-48c0-961f-76d7892a546a', 'ervinaanakbaik@gmail.com');
    const res1 = await request("/api/auth/me", {
      token: tokenErvina,
      companyId: 'e93c532b-e52d-4486-a556-2d84838414d0'
    });
    assert(res1.status === 200, "1. GET /api/auth/me returns 200");
    assert(res1.data?.data?.user?.activeRole === "member", "1.1 Active role is 'member' (Employee)", res1.data);
    assert(res1.data?.data?.user?.isManagement === false, "1.2 isManagement is false for Employee", res1.data);
    assert(res1.data?.data?.user?.company?.id === 'e93c532b-e52d-4486-a556-2d84838414d0', "1.3 Company is PT. Mencari Cintanya Killa");

    // Test 2: Switch to Management Company
    // Ervina in 'persero' ('554ba231-1039-48c4-9258-2d8ef8330431') is 'owner'
    const res2 = await request("/api/auth/me", {
      token: tokenErvina,
      companyId: '554ba231-1039-48c4-9258-2d8ef8330431'
    });
    assert(res2.status === 200, "2. GET /api/auth/me for Management company returns 200");
    assert(res2.data?.data?.user?.activeRole === "owner", "2.1 Active role is 'owner' (Management)", res2.data);
    assert(res2.data?.data?.user?.isManagement === true, "2.2 isManagement is true for Owner", res2.data);
    assert(res2.data?.data?.user?.company?.id === '554ba231-1039-48c4-9258-2d8ef8330431', "2.3 Company is 'persero'");

    // Test 3: Account B (Admin/Manager)
    // Dumpme ('2cd58086-e794-4a4e-8f57-66a7539402be') in PT. Mencari Cintanya Killa is 'admin'
    const tokenDumpme = createToken('2cd58086-e794-4a4e-8f57-66a7539402be', 'dumpme1105@gmail.com');
    const res3 = await request("/api/auth/me", {
      token: tokenDumpme,
      companyId: 'e93c532b-e52d-4486-a556-2d84838414d0'
    });
    assert(res3.status === 200, "3. GET /api/auth/me for Admin returns 200");
    assert(res3.data?.data?.user?.activeRole === "admin", "3.1 Active role is 'admin'", res3.data);
    assert(res3.data?.data?.user?.isManagement === true, "3.2 isManagement is true for Admin", res3.data);

    // Test 4: Stale Header Isolation
    // Suppose Dumpme sends a company ID that belongs to another tenant they are NOT a member of ('0c73141b-84ce-4f2b-949a-0fbb148e3ae0')
    const res4 = await request("/api/auth/me", {
      token: tokenDumpme,
      companyId: '0c73141b-84ce-4f2b-949a-0fbb148e3ae0' // invalid for Dumpme
    });
    assert(res4.status === 200, "4. GET /api/auth/me with stale/invalid header returns 200");
    // Should fallback to Dumpme's own valid company, NOT the invalid cross-tenant company!
    assert(res4.data?.data?.user?.company?.id !== '0c73141b-84ce-4f2b-949a-0fbb148e3ae0', "4.1 Stale header was NOT used to access invalid tenant", res4.data);
    assert(['e93c532b-e52d-4486-a556-2d84838414d0', '554ba231-1039-48c4-9258-2d8ef8330431'].includes(res4.data?.data?.user?.company?.id), "4.2 Resolved valid company for user");

    // Test 5: User with no company
    // Damar ('712b5b2b-81e8-4746-a93f-51b890d3afd8')
    const tokenDamar = createToken('712b5b2b-81e8-4746-a93f-51b890d3afd8', 'damar.yosa@student.upi.edu');
    const res5 = await request("/api/auth/me", { token: tokenDamar });
    assert(res5.status === 200, "5. User without company returns 200");
    assert(res5.data?.data?.user?.company === null, "5.1 Company is null", res5.data);
    assert(res5.data?.data?.user?.activeRole === "member", "5.2 Role is default 'member'", res5.data);
    assert(res5.data?.data?.user?.isManagement === false, "5.3 isManagement is false", res5.data);

    // Test 6: Memberships Endpoint Isolation
    const res6 = await request("/api/companies/memberships", { token: tokenDumpme });
    assert(res6.status === 200, "6. GET /api/companies/memberships returns 200");
    const memberships = res6.data?.data || [];
    assert(memberships.length >= 2, "6.1 Returns multiple memberships for multi-tenant user");
    const allBelongToDumpme = memberships.every((m: any) => m.profile_id === '2cd58086-e794-4a4e-8f57-66a7539402be');
    assert(allBelongToDumpme, "6.2 All memberships strictly belong to authenticated user");

    console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error("Test error:", err);
  if (server) server.close();
  process.exit(1);
});
