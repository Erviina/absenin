import dotenv from "dotenv";
dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.log("DATABASE_URL is not set");
  process.exit(1);
}

try {
  const parsed = new URL(dbUrl);
  console.log("DB Host:", parsed.hostname);
  console.log("DB Port:", parsed.port);
  console.log("DB Database:", parsed.pathname);
  console.log("DB Username:", parsed.username);
  console.log("DB SearchParams:", parsed.search);
} catch (e: any) {
  console.error("Failed to parse URL:", e.message);
}
