const jwt = require("jsonwebtoken");

async function run() {
  try {
    const adminUser = { id: '2cd58086-e794-4a4e-8f57-66a7539402be', email: 'dumpme1105@gmail.com' }; 
    const employeeUser = { id: 'dummy-employee-id', email: 'employee@test.com' };

    const secret = "supersecret";
    const tokenAdmin = jwt.sign({ sub: adminUser.id, email: adminUser.email }, secret, { expiresIn: '1h' });
    const tokenEmployee = jwt.sign({ sub: employeeUser.id, email: employeeUser.email }, secret, { expiresIn: '1h' });

    console.log("Testing Admin...");
    let res = await fetch("http://localhost:3001/api/companies/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tokenAdmin}` },
      body: JSON.stringify({ name: `Perusahaan Updated by Admin` })
    });
    console.log("Admin status:", res.status);
    console.log(await res.json());

    console.log("Testing Employee...");
    res = await fetch("http://localhost:3001/api/companies/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tokenEmployee}` },
      body: JSON.stringify({ name: `Perusahaan Updated by Employee` })
    });
    console.log("Employee status:", res.status);
    console.log(await res.json());
  } catch(e) {
    console.log(e);
  }
}
run();
