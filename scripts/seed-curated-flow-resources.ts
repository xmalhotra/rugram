import dotenv from 'dotenv';
import {Pool} from 'pg';
import {neon} from '@neondatabase/serverless';
import {curatedFlowEvents,curatedFlowProducts} from '../shared/curated-flow-resources';
dotenv.config({path:process.env.DOTENV_CONFIG_PATH??'.env.local',quiet:true});
const connectionString=process.env.DATABASE_URL;
if(!connectionString)throw new Error('DATABASE_URL is required. The local demo already includes these resources.');
const local=['127.0.0.1','localhost','[::1]'].includes(new URL(connectionString).hostname)||process.env.DATABASE_DRIVER==='postgres';
const pool=local?new Pool({connectionString}):null;
const sql=pool?{query:async(text:string,values:unknown[])=>(await pool.query(text,values)).rows}:neon(connectionString);
try{
  let inserted=0;
  for(const item of [...curatedFlowProducts,...curatedFlowEvents]){
    const rows=await sql.query('INSERT INTO mobile_catalog(id,kind,data) VALUES($1,$2,$3::jsonb) ON CONFLICT(id) DO NOTHING RETURNING id',[item.id,'city' in item?'event':'product',JSON.stringify(item)]);
    inserted+=rows.length;
  }
  console.log(`Inserted ${inserted} source-linked records. Existing records and moderation choices were preserved.`);
}finally{await pool?.end();}
