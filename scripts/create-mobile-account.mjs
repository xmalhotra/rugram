import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? '.env.local', quiet: true });
const [rawHandle, name, role] = process.argv.slice(2);
// Every username starts with q_.
const handle = rawHandle && (rawHandle.toLowerCase().startsWith('q_') ? rawHandle : `q_${rawHandle}`);
const password = process.env.ACCOUNT_PASSWORD;
if (!process.env.DATABASE_URL || !handle || !name || !['user','creator','admin'].includes(role) || !password || password.length < 12) {
  console.error('Set DATABASE_URL and ACCOUNT_PASSWORD (12+ chars). Usage: node scripts/create-mobile-account.mjs HANDLE NAME user|creator|admin');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);
await sql`INSERT INTO users(id,handle,name,role,password_hash) VALUES(${crypto.randomUUID()},${handle.toLowerCase()},${name},${role === 'user' ? 'member' : role},${await bcrypt.hash(password,12)})`;
console.log(`Created ${role} account ${handle}.`);
