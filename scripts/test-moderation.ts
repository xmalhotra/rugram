import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import {Pool} from 'pg';
dotenv.config({path:'.env.local',quiet:true});
async function main(){
  const url=new URL(process.env.DATABASE_URL??'');
  if(!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!=='/betterhabits_local')throw new Error('Use the isolated betterhabits_local database.');
  process.env.RUGRAM_DEMO_MODE='false';
  const {getUser}=await import('../src/lib/store');
  const {submitItem,changePendingSubmission,reviewItem,mobileBootstrap}=await import('../src/lib/mobile-store');
  const {mutateContent}=await import('../src/lib/admin-content-store');
  const {curatedFlowProducts}=await import('../shared/curated-flow-resources');
  const pool=new Pool({connectionString:url.toString()});const ids=[crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()];
  const itemIds:string[]=[];
  try{
    for(const [index,id]of ids.entries())await pool.query('INSERT INTO users(id,handle,name,role) VALUES($1,$1,$1,$2)',[id,index===0?'admin':'creator']);
    const [admin,creator,stranger]=await Promise.all(ids.map(id=>getUser(id)));
    const product={...curatedFlowProducts[0],title:'Disposable moderation fixture',id:'',status:'pending' as const};
    for(let index=0;index<3;index++)await submitItem(creator!,{...product,title:`${product.title} ${index}`},`moderation-${index}-${ids[1]}`);
    const rows=await pool.query("SELECT id,data FROM mobile_catalog WHERE data->>'createdBy'=$1 ORDER BY id",[creator!.id]);
    itemIds.push(...rows.rows.map(row=>String(row.id)));
    const [edited,rejected,withdrawn]=itemIds;
    await assert.rejects(changePendingSubmission(stranger!,edited,'edit',product),/Listing not found/);
    await assert.rejects(changePendingSubmission(admin!,edited,'withdraw'),/Creator access/);
    await changePendingSubmission(creator!,edited,'edit',{...product,title:'Updated fixture',createdBy:stranger!.id,status:'published'});
    const changed=(await pool.query('SELECT data FROM mobile_catalog WHERE id=$1',[edited])).rows[0].data;
    assert.equal(changed.title,'Updated fixture');assert.equal(changed.createdBy,creator!.id);assert.equal(changed.status,'pending');
    await assert.rejects(reviewItem(admin!,rejected,'archived'),/needs a reason/);
    await reviewItem(admin!,rejected,'archived','Please supply a current source.','sources');
    const bootstrap=await mobileBootstrap(creator!);
    assert.equal(bootstrap.products.find(item=>item.id===rejected)?.reviewNote,'Please supply a current source.');
    assert.ok((await pool.query('SELECT id FROM mobile_content_audit WHERE item_id=$1 AND data->>\'reviewCode\'=\'sources\'',[rejected])).rowCount);
    await assert.rejects(changePendingSubmission(creator!,rejected,'edit',product),/pending/);
    await changePendingSubmission(creator!,withdrawn,'withdraw');
    await assert.rejects(reviewItem(admin!,withdrawn,'published'),/withdrawn/);
    await assert.rejects(pool.query("UPDATE mobile_catalog SET data=jsonb_set(data,'{status}','\"published\"') WHERE id=$1",[withdrawn]),{code:'23514'});
    await mutateContent(admin!,{kind:'product',id:edited,version:0,action:'archive',reviewNote:'The test listing is no longer needed.',reviewCode:'other'},{kind:'product',id:edited,title:changed.title,version:0,status:'draft',hasDraft:false,data:changed,publishedData:changed,updatedAt:null});
    assert.equal((await mobileBootstrap(creator!)).products.find(item=>item.id===edited)?.reviewCode,'other');
    console.log('PASS: own pending edits, server ownership/status protection, required rejection reason, creator-visible feedback, audit persistence, withdrawal and database publication guard.');
  }finally{
    await pool.query('DELETE FROM mobile_content_audit WHERE actor_id=ANY($1::text[])',[ids]);
    await pool.query('DELETE FROM mobile_content WHERE id=ANY($1::text[])',[itemIds]);
    await pool.query('DELETE FROM mobile_catalog WHERE id=ANY($1::text[])',[itemIds]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::text[])',[ids]);
    await pool.end();await globalThis.betterHabitsPgPool?.end();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
