import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';
dotenv.config({path:process.env.DOTENV_CONFIG_PATH ?? '.env.local',quiet:true});
const url=process.env.DATABASE_URL;if(!url) throw new Error('DATABASE_URL is required.');
const local=['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname) || process.env.DATABASE_DRIVER==='postgres';
const pool=local ? new Pool({connectionString:url}):null;const sql=pool ? {query:async(text)=>(await pool.query(text)).rows}:neon(url);
try {
  await sql.query('DELETE FROM sessions WHERE expires_at < now()');
  await sql.query("DELETE FROM request_buckets WHERE reset_at < now()-interval '1 day'");
  await sql.query("DELETE FROM mobile_analytics WHERE at < now()-interval '90 days'");
  await sql.query('DELETE FROM phone_otp_challenges WHERE expires_at < now()');
  await sql.query("DELETE FROM mobile_notifications WHERE read_at < now()-interval '30 days'");
  await sql.query("DELETE FROM mobile_completion_receipts WHERE created_at < now()-interval '90 days'");
  console.log('Expired sessions/buckets and analytics older than 90 days removed.');
} finally {await pool?.end();}
