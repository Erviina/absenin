import fetch from "node-fetch";

async function main() {
  try {
    const loginRes = await fetch("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ervina@absenin.com", password: "password123" }) // assuming dummy login works
    });
    const loginData = await loginRes.json();
    console.log("Login:", loginData);

    if (!loginData.success) {
      console.log("Cannot login to test patch. Will stop.");
      process.exit(0);
    }
    
    const token = loginData.data.accessToken;

    const payload = {
      title: "Senam Pagi",
      notes: "sadsad",
      start_time: "2026-10-08T18:00:00.000Z",
      end_time: "2026-10-08T19:00:00.000Z",
      agenda_category_id: "95a7fd20-a932-46ad-9c08-365d7a0532e5"
    };

    console.log("Sending PATCH to /agendas/ff3c7f2c-ba58-4c50-80ed-4ecab75a19b2");
    const res = await fetch("http://localhost:3001/api/agendas/ff3c7f2c-ba58-4c50-80ed-4ecab75a19b2", {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("Response:", data);
  } catch (e: any) {
    console.error("Error:", e);
  }
}

main();
