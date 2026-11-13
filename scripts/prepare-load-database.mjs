import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { readFile, readdir } from 'node:fs/promises';
const connectionString=process.env.DATABASE_URL;
if(!connectionString || new URL(connectionString).hostname!=='127.0.0.1' || new URL(connectionString).port!=='55432') throw new Error('This fixture loader only operates on isolated loopback port 55432.');
const pool=new Pool({connectionString});
try {
  const names=await readdir('db/migrations');
  for(const name of names.filter(n=>n.endsWith('.sql')).sort()) await pool.query(await readFile(`db/migrations/${name}`,'utf8'));
  await pool.query("DELETE FROM mobile_catalog WHERE data->>'createdBy' LIKE 'load-%'; DELETE FROM users WHERE id LIKE 'load-%'; DELETE FROM request_buckets WHERE key LIKE '%load-%'");
  const hash=await bcrypt.hash('simulation-pass-12345',4);
  await pool.query("INSERT INTO users(id,handle,name,role,password_hash) SELECT 'load-user-'||n,'load-user-'||n,'Load User '||n,'member',$1 FROM generate_series(1,10000) n ON CONFLICT DO NOTHING",[hash]);
  for(const [id,role] of [['load-admin','admin'],['load-creator','creator']]) await pool.query('INSERT INTO users(id,handle,name,role,password_hash) VALUES($1,$1,$1,$2,$3) ON CONFLICT DO NOTHING',[id,role,hash]);
  await pool.query(`INSERT INTO mobile_catalog(id,kind,data) SELECT 'load-product-'||lpad(n::text,4,'0'),'product',jsonb_build_object('id','load-product-'||lpad(n::text,4,'0'),'title','Fixture product '||n,'category',CASE WHEN n%2=0 THEN 'Food' ELSE 'Electronics' END,'tier','Essential','price',100+n,'summary','Isolated database load fixture','url','https://example.com','checkedAt',now(),'status','published','createdBy','load-admin','endorsements','[]'::jsonb) FROM generate_series(1,600) n ON CONFLICT DO NOTHING`);
  console.log('Prepared isolated database: 10,000 users, creator/admin, 600 products, all migrations.');
} finally {await pool.end();}
