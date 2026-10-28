import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{Miniflare}=await import(createRequire(require.resolve('wrangler')).resolve('miniflare'));
const root=resolve('dist/server'),paths=readdirSync(root,{recursive:true}).filter(x=>/\.m?js$/.test(x));paths.sort((a,b)=>a==='index.js'?-1:b==='index.js'?1:a.localeCompare(b));
const mf=new Miniflare({modules:paths.map(p=>({type:'ESModule',path:resolve(root,p),contents:readFileSync(resolve(root,p),'utf8')})),modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'inbound-test'},cf:false,bindings:{NEXORA_OWNER_WORKSPACE_ID:'owner-a'},outboundService:()=>{throw Error('Public inquiry must not call an external provider')}});
try{
 const db=await mf.getD1Database('DB');for(const f of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
 const body=()=>({submissionId:crypto.randomUUID(),name:'Disposable QA contact',email:'qa@example.test',company:'QA company',website:'https://example.test',service:'Article Writing',country:'USA',brief:'A disposable article-writing brief used only in a local test.',consent:true,companyFax:''});
 const send=async(p,origin='https://nexora.test')=>{const r=await mf.dispatchFetch('https://nexora.test/api/public-inquiry',{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.1'},body:JSON.stringify(p)});return {status:r.status,data:await r.json()}};
 const a=body();assert.equal((await send(a,'https://evil.test')).status,403);assert.equal((await send({...a,owner:'attacker'})).status,400);assert.equal((await send({...a,consent:false})).status,400);assert.equal((await send({...a,website:'javascript:alert(1)'})).status,400);assert.equal((await send({...a,companyFax:'spam'})).status,400);
 const accepted=await send(a);assert.equal(accepted.status,200,JSON.stringify(accepted));assert.deepEqual(Object.keys(accepted.data).sort(),['receipt','received']);
 assert.equal((await send(a)).status,200);assert.equal((await send({...a,brief:'Changed payload for the same submission ID.'})).status,409);
 const all=(await db.prepare('SELECT * FROM nexora_records').all()).results;assert.equal(all.length,1);assert.equal(all[0].owner,'owner-a');const lead=JSON.parse(all[0].payload);assert.equal(lead.inbound,true);assert.equal(lead.verified,false);assert.equal(lead.contactEmailVerified,false);assert.equal(lead.stage,'Replied');assert.equal(lead.orderAccepted,undefined);assert.equal(lead.payment,undefined);assert.ok(!all[0].payload.includes('192.0.2.1'));
 assert.equal((await db.prepare('SELECT * FROM nexora_agent_alerts').all()).results.length,1);
 const other=await mf.dispatchFetch('https://nexora.test/api/records',{headers:{'oai-authenticated-user-id':'owner-b','oai-authenticated-user-email':'b@example.test'}});assert.equal((await other.json()).records.length,0);
 await db.prepare("UPDATE nexora_records SET payload=json_set(payload,'$.stage','Do not contact') WHERE id=?").bind(all[0].id).run();assert.equal((await send(body())).status,200);assert.equal((await db.prepare('SELECT count(*) AS n FROM nexora_records').first()).n,1,'Suppressed contact is never reactivated by a public inquiry');
 for(let i=0;i<4;i++)assert.equal((await send({...body(),email:'qa'+i+'@example.test'})).status,200);
 assert.equal((await send({...body(),email:'overlimit@example.test'})).status,429);
 console.log('PASS: public anonymous intake, strict schema/consent/origin, honeypot, idempotent receipt and alert, exact private owner routing, account isolation, unverified lead state, suppression and per-network rate limit. Local disposable database only.');
}finally{await mf.dispose()}
