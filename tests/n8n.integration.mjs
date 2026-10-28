import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{Miniflare}=await import(createRequire(require.resolve('wrangler')).resolve('miniflare'));
const root=resolve('dist/server'),paths=readdirSync(root,{recursive:true}).filter(x=>/\.m?js$/.test(x));paths.sort((a,b)=>a==='index.js'?-1:b==='index.js'?1:a.localeCompare(b));
let externalCalls=0;
const mf=new Miniflare({modules:paths.map(p=>({type:'ESModule',path:resolve(root,p),contents:readFileSync(resolve(root,p),'utf8')})),modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'n8n-test'},cf:false,outboundService:()=>{externalCalls++;throw Error('No external execution expected');}});
try{
 const db=await mf.getD1Database('DB');for(const f of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
 const api=async(owner,path,body,token)=>{const headers={'content-type':'application/json',origin:'https://nexora.test'};if(owner){headers['oai-authenticated-user-id']=owner;headers['oai-authenticated-user-email']=owner+'@example.test';}if(token)headers.authorization='Bearer '+token;const r=await mf.dispatchFetch('https://nexora.test'+path,{method:body?'POST':'GET',headers,...body?{body:JSON.stringify(body)}:{}});return {status:r.status,data:await r.json()};};
 const manage=(o,b)=>api(o,'/api/n8n',b),worker=(token,b)=>api(null,'/api/n8n/worker',b,token);
 assert.equal((await api(null,'/api/n8n')).status,401);
 const a=await manage('a',{action:'create'}),b=await manage('b',{action:'create'});assert.equal(a.status,200);const token=a.data.token;
 assert.equal(a.data.enabled,false);assert.equal(a.data.allowPosting,false);assert.equal(a.data.allowNetwork,false);assert.equal((await manage('a',{action:'configure',enabled:true,allowModel:false,allowPosting:true})).status,400);assert.equal((await manage('a',{action:'configure',enabled:true,allowModel:false,allowNetwork:true})).status,400);assert.equal((await worker(token,{action:'tick'})).data.paused,true);
 assert.equal((await worker('invalid',{action:'tick'})).status,401);
 let stored=await db.prepare('SELECT * FROM nexora_n8n WHERE owner=?').bind('a').first();assert.equal(stored.token_hash.length,64);assert.notEqual(stored.token_hash,token);
 assert.ok(!JSON.stringify((await api('a','/api/n8n')).data).includes('token_hash'));assert.equal((await api('a','/api/n8n')).data.token,undefined);
 await manage('a',{action:'configure',enabled:true,allowModel:false});assert.equal((await worker(token,{action:'tick'})).data.job,null);
 // Seed only this test database; no customer records or external provider calls.
 const now=new Date().toISOString(),control={enabled:true,inboundOnly:true,noPaidProvider:true,keywords:'SEO agency founders',markets:'USA',services:['Guest Posting'],dailyLimit:10,discoveryLimit:1,autoResearch:false,autoDraft:false,autoReply:false,autoProposal:false,autoContent:true,contentBrief:'Owner-approved factual content brief.',minimumMargin:20};
 await api('a','/api/autonomy',{action:'configure',config:control});await manage('a',{action:'configure',enabled:true,allowModel:true});
 const work=(await worker(token,{action:'tick'})).data;assert.equal(work.job.type,'content');assert.equal(work.record,null);assert.ok(work.outputSchema);
 assert.equal((await worker(b.data.token,{action:'complete',job_id:work.job.id,lease:work.job.lease,result:{}})).data.paused,true);
 await manage('b',{action:'configure',enabled:true,allowModel:true});
 assert.equal((await worker(b.data.token,{action:'complete',job_id:work.job.id,lease:work.job.lease,result:{}})).status,400);
 assert.equal((await worker(token,{action:'tick'})).data.job,null,'Exclusive running task is not claimed twice');
 const body={action:'complete',job_id:work.job.id,lease:work.job.lease,result:{topic:'QA draft',body:'Owner review is required for this isolated QA post.',sources:[]}};
 await manage('a',{action:'configure',enabled:false,allowModel:true});assert.equal((await worker(token,body)).data.paused,true);
 await manage('a',{action:'configure',enabled:true,allowModel:true});assert.equal((await worker(token,body)).data.state,'completed');assert.equal((await worker(token,body)).status,400);
 const reviews=await db.prepare('SELECT * FROM nexora_reviews WHERE owner=?').bind('a').all();assert.equal(reviews.results.length,1);assert.equal(reviews.results[0].state,'pending');
 const priv=(await api('a','/api/records')).data.records;assert.ok(!JSON.stringify(priv).includes(stored.token_hash));assert.equal((await worker(token,{action:'publish'})).status,400);
 await db.prepare('UPDATE nexora_n8n SET expires_at=? WHERE owner=?').bind('2000-01-01','a').run();assert.equal((await worker(token,{action:'status'})).status,401);
 const replacement=await manage('a',{action:'create'});assert.equal((await worker(token,{action:'status'})).status,401);await manage('a',{action:'revoke'});assert.equal((await worker(replacement.data.token,{action:'status'})).status,401);
 const noScope=(await api(null,'/api/n8n/account',{action:'cycle'},b.data.token)).data;assert.equal(noScope.posting.processed,0);assert.equal(noScope.network.processed,0);assert.equal((await api(null,'/api/n8n/account',{action:'publish',body:'bypass'},b.data.token)).status,400);assert.equal(externalCalls,0);console.log('PASS n8n integration: auth, per-owner isolation, hashed token, consent, pause, lease, validated approval, duplicate rejection, expiry, rotation/revoke, no external execution.');
}finally{await mf.dispose();}
