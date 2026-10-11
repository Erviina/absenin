import { db } from "./src/db";
import { profiles, companies, profileRoles } from "./src/db/schema";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function testAuth() {
  const email = "ervinaanakbaik@gmail.com";
  
  let profileResult = await db.select().from(profiles).where(eq(profiles.email, email));
  let profile = profileResult[0];
  
  console.log("1. Profile:", profile);
  
  let company = null;
  if (profile.company_id) {
    const companyResult = await db.select().from(companies).where(eq(companies.id, profile.company_id));
    if (companyResult.length > 0) {
      company = companyResult[0];
    }
  }
  
  console.log("2. Company:", company);
  
  const rolesResult = await db.select().from(profileRoles).where(eq(profileRoles.profile_id, profile.id));
  const roles = rolesResult.map((r) => r.role) || [];
  
  console.log("3. Roles:", roles);
  
  const user = {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    avatarUrl: profile.avatar_url,
    company: company,
    roles: roles,
  };
  
  console.log("4. User Object for JWT/Response:");
  console.log(JSON.stringify(user, null, 2));
}

testAuth().then(() => process.exit(0));
