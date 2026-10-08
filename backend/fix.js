const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.qcsbuamomvduabkgajkd:absenin2026@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres' });
client.connect().then(() => client.query("UPDATE profiles SET company_id = '13d9d099-3d78-47c6-a418-c8d48b880a71'")).then(() => console.log('success')).catch(console.error).finally(() => client.end());
