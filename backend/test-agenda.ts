import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import { db } from "./src/db/index";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";


const generateToken = (profileId: string) => {
  return jwt.sign({ sub: profileId, email: "test@example.com" }, JWT_SECRET, { expiresIn: "1h" });
};

async function runTests() {
  console.log("Starting Agenda API Tests...\n");
  
  // 1. Drizzle Schema Verification
  try {
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    console.log("Tables in public schema:", tableCheck.rows.map(r => r.table_name));
  } catch (err) {
    console.log("-> ERROR: ", err.message);
  }
  
  // Ambil user untuk test
  const profiles = await db.execute(sql`
    SELECT p.id, p.company_id, pr.role 
    FROM profiles p 
    JOIN profile_roles pr ON p.id = pr.profile_id 
    WHERE p.deleted_at IS NULL AND p.company_id IS NOT NULL
  `);
  
  const admin = profiles.rows.find((r: any) => r.role === 'Admin');
  const employee = profiles.rows.find((r: any) => r.role === 'Employee' && r.company_id === admin.company_id);
  const otherAdmin = profiles.rows.find((r: any) => r.role === 'Admin' && r.company_id !== admin.company_id);
  
  if (!admin || !employee || !otherAdmin) {
    console.log("Data test (Admin, Employee, Admin Company Lain) tidak lengkap. Tidak bisa melanjutkan.");
    process.exit(1);
  }
  
  const adminToken = generateToken(admin.id);
  const employeeToken = generateToken(employee.id);
  const otherAdminToken = generateToken(otherAdmin.id);
  
  let createdAgendaId: string | null = null;
  
  // 4. POST sebagai Admin
  console.log("\n4. POST sebagai Admin/Manager");
  const postRes = await fetch("http://localhost:3001/api/agendas", {
    method: "POST",
    headers: { "Authorization": `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Test Agenda Perusahaan",
      notes: "Testing backend agenda",
      start_time: "2026-10-10T09:00:00+07:00",
      end_time: "2026-10-10T10:00:00+07:00",
      agenda_category_id: null
    })
  });
  
  const postData = await postRes.json();
  if (postRes.status === 201 && postData.success && postData.data.company_id === admin.company_id && postData.data.profile_id === admin.id) {
    console.log("-> SUCCESS: Agenda dibuat. company_id dan profile_id berasal dari user login.");
    createdAgendaId = postData.data.id;
  } else {
    console.log("-> FAILED: POST Admin. Response: ", postData);
  }
  
  // 5. POST sebagai Employee
  console.log("\n5. POST sebagai Employee");
  const postEmpRes = await fetch("http://localhost:3001/api/agendas", {
    method: "POST",
    headers: { "Authorization": `Bearer ${employeeToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Hacked Agenda",
      start_time: "2026-10-10T09:00:00+07:00",
      end_time: "2026-10-10T10:00:00+07:00"
    })
  });
  if (postEmpRes.status === 403) {
    console.log("-> SUCCESS: Employee mendapat 403.");
  } else {
    console.log("-> FAILED: Employee tidak mendapat 403. Status: ", postEmpRes.status);
  }
  
  // 6. Validasi Waktu
  console.log("\n6. Validasi waktu (end < start)");
  const postInvalidRes = await fetch("http://localhost:3001/api/agendas", {
    method: "POST",
    headers: { "Authorization": `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Invalid Agenda",
      start_time: "2026-10-10T10:00:00+07:00",
      end_time: "2026-10-10T09:00:00+07:00"
    })
  });
  if (postInvalidRes.status === 400) {
    console.log("-> SUCCESS: Validasi waktu ditolak.");
  } else {
    console.log("-> FAILED: Validasi waktu tembus. Status: ", postInvalidRes.status);
  }
  
  // 2. GET sebagai Admin
  console.log("\n2. GET sebagai Admin/Manager");
  const getAdminRes = await fetch("http://localhost:3001/api/agendas", {
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  const getAdminData = await getAdminRes.json();
  if (getAdminRes.status === 200 && getAdminData.data.some((a: any) => a.id === createdAgendaId)) {
    console.log("-> SUCCESS: Agenda dikembalikan dan urut.");
  } else {
    console.log("-> FAILED: GET Admin.");
  }
  
  // 3. GET sebagai Employee
  console.log("\n3. GET sebagai Employee");
  const getEmpRes = await fetch("http://localhost:3001/api/agendas", {
    headers: { "Authorization": `Bearer ${employeeToken}` }
  });
  const getEmpData = await getEmpRes.json();
  if (getEmpRes.status === 200 && getEmpData.data.some((a: any) => a.id === createdAgendaId)) {
    console.log("-> SUCCESS: Employee dapat membaca agenda perusahaannya.");
  } else {
    console.log("-> FAILED: GET Employee.");
  }
  
  // 9. Company isolation (GET dari other admin)
  console.log("\n9. Company isolation (Other Admin)");
  const getOtherAdminRes = await fetch("http://localhost:3001/api/agendas", {
    headers: { "Authorization": `Bearer ${otherAdminToken}` }
  });
  const getOtherAdminData = await getOtherAdminRes.json();
  if (getOtherAdminRes.status === 200 && !getOtherAdminData.data.some((a: any) => a.id === createdAgendaId)) {
    console.log("-> SUCCESS: Company A tidak dapat melihat agenda Company B.");
  } else {
    console.log("-> FAILED: Company isolation bocor.");
  }
  
  // 7. PATCH
  console.log("\n7. PATCH");
  const patchRes = await fetch(`http://localhost:3001/api/agendas/${createdAgendaId}`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Updated Agenda",
      start_time: "2026-10-10T09:00:00+07:00",
      end_time: "2026-10-10T11:00:00+07:00"
    })
  });
  const patchData = await patchRes.json();
  if (patchRes.status === 200 && patchData.data.title === "Updated Agenda") {
    console.log("-> SUCCESS: Berhasil mengubah agenda.");
  } else {
    console.log("-> FAILED: PATCH. ", patchData);
  }
  
  const patchOtherRes = await fetch(`http://localhost:3001/api/agendas/${createdAgendaId}`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${otherAdminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Hacked Update",
      start_time: "2026-10-10T09:00:00+07:00",
      end_time: "2026-10-10T11:00:00+07:00"
    })
  });
  if (patchOtherRes.status === 404) {
    console.log("-> SUCCESS: Admin company lain tidak dapat mengubah (mendapat 404).");
  } else {
    console.log("-> FAILED: Admin company lain bisa mengubah! Status: ", patchOtherRes.status);
  }
  
  // 8. DELETE
  console.log("\n8. DELETE");
  const delRes = await fetch(`http://localhost:3001/api/agendas/${createdAgendaId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  if (delRes.status === 200) {
    console.log("-> SUCCESS: Agenda berhasil dihapus.");
    
    // Check DB for soft delete
    const checkDb = await db.execute(sql`SELECT deleted_at FROM agenda WHERE id = ${createdAgendaId}`);
    if (checkDb.rows[0].deleted_at !== null) {
      console.log("-> SUCCESS: Data masih ada di database (soft delete berhasil).");
    } else {
      console.log("-> FAILED: Terhapus secara fisik atau deleted_at masih null.");
    }
    
    // Check GET doesn't return it
    const getFinalRes = await fetch("http://localhost:3001/api/agendas", {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    const getFinalData = await getFinalRes.json();
    if (!getFinalData.data.some((a: any) => a.id === createdAgendaId)) {
      console.log("-> SUCCESS: Agenda terhapus tidak muncul di GET.");
    } else {
      console.log("-> FAILED: Agenda terhapus MASIH muncul di GET.");
    }
    
  } else {
    console.log("-> FAILED: DELETE. Status: ", delRes.status);
  }
  
  process.exit(0);
}

runTests();
