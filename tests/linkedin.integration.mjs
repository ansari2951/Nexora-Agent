// Isolated built-Worker/D1 tests. All LinkedIn HTTP calls are intercepted locally.
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {Miniflare}=await import(createRequire(require.resolve('wrangler')).resolve('miniflare'));
const root=resolve('dist/server'),paths=readdirSync(root,{recursive:true}).filter(x=>/\.m?js$/.test(x));paths.sort((a,b)=>a==='index.js'?-1:b==='index.js'?1:a.localeCompare(b));
let postCalls=0,tokenCalls=0,mode='success',subject='qa-subject';
const mf=new Miniflare({modules:paths.map(p=>({type:'ESModule',path:resolve(root,p),contents:readFileSync(resolve(root,p),'utf8')})),modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'linkedin-test'},cf:false,bindings:{LINKEDIN_CLIENT_ID:'test-client',LINKEDIN_CLIENT_SECRET:'test-secret',LINKEDIN_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,9).toString('base64'),LINKEDIN_API_VERSION:'202610'},outboundService:async req=>{
 const u=new URL(req.url);
 if(u.href==='https://www.linkedin.com/oauth/v2/accessToken'){tokenCalls++;assert.equal(req.method,'POST');return Response.json({access_token:'LOCAL-TEST-TOKEN-NEVER-REAL',expires_in:86400,scope:'openid profile w_member_social'});}
 if(u.href==='https://api.linkedin.com/v2/userinfo')return Response.json({sub:subject,name:'Isolated QA Member'});
 if(u.href==='https://api.linkedin.com/rest/posts'){postCalls++;assert.equal(req.headers.get('authorization'),'Bearer LOCAL-TEST-TOKEN-NEVER-REAL');assert.equal(req.headers.get('linkedin-version'),'202610');const b=await req.json();assert.equal(b.author,'urn:li:person:qa-subject');assert.equal(b.visibility,'PUBLIC');assert.ok(b.commentary);return mode==='success'?new Response(null,{status:201,headers:{'x-restli-id':'urn:li:share:987654321'}}):new Response(null,{status:mode==='denied'?403:503});}
 throw Error('Unexpected external request in isolated test: '+u.origin+u.pathname);
}});
try{
 const db=await mf.getD1Database('DB');for(const f of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())for(const s of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(s.trim())await db.prepare(s.trim()).run();
 const call=async(method,owner='owner-a',body=null,origin='https://nexora.test',path='/api/linkedin')=>{const headers={'content-type':'application/json',origin};if(owner){headers['oai-authenticated-user-id']=owner;headers['oai-authenticated-user-email']=owner+'@example.test';}const r=await mf.dispatchFetch('https://nexora.test'+path,{method,headers,redirect:'manual',...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,location:r.headers.get('location'),data:r.headers.get('content-type')?.includes('application/json')?await r.json():null};};
 assert.equal((await call('GET',null)).status,401);assert.equal((await call('POST','owner-a',{action:'connect'},'https://bad.test')).status,403);
 async function connect(){const start=await call('POST','owner-a',{action:'connect'});assert.equal(start.status,200,JSON.stringify(start));const u=new URL(start.data.url);assert.equal(u.origin,'https://www.linkedin.com');assert.equal(u.searchParams.get('redirect_uri'),'https://nexora.test/api/linkedin/callback');return u.searchParams.get('state');}
 const state=await connect(),path='/api/linkedin/callback?state='+state+'&code=qa-code';
 assert.ok((await call('GET','owner-b',null,undefined,path)).location.endsWith('linkedin=error'));assert.equal(tokenCalls,0);
 assert.ok((await call('GET','owner-a',null,undefined,path)).location.endsWith('linkedin=connected'));assert.equal(tokenCalls,1);
 assert.ok((await call('GET','owner-a',null,undefined,path)).location.endsWith('linkedin=error'));assert.equal(tokenCalls,1);
 const expired=await connect();await db.prepare('UPDATE nexora_linkedin_states SET expires_at = ?').bind('2000-01-01T00:00:00.000Z').run();assert.ok((await call('GET','owner-a',null,undefined,'/api/linkedin/callback?state='+expired+'&code=qa')).location.endsWith('linkedin=error'));assert.equal(tokenCalls,1);
 let status=(await call('GET')).data;assert.equal(status.connected,true);assert.equal(status.canPublish,true);assert.ok(!JSON.stringify(status).includes('LOCAL-TEST-TOKEN'));
 const stored=await db.prepare('SELECT encrypted_token FROM nexora_linkedin_accounts').first();assert.ok(!stored.encrypted_token.includes('LOCAL-TEST-TOKEN'));assert.equal(stored.encrypted_token.split('.').length,2);
 assert.equal((await call('GET','owner-b')).data.connected,false);assert.equal((await call('GET','owner-b')).data.posts.length,0);
 const post=()=>({id:crypto.randomUUID(),body:'Approved isolated test post. No real LinkedIn account is used.',scheduledAt:new Date(Date.now()-1000).toISOString(),approved:true});
 let p=post();assert.equal((await call('POST','owner-a',{action:'schedule',post:{...p,approved:false}})).status,400);
 assert.equal((await call('POST','owner-b',{action:'schedule',post:p})).status,400);
 assert.equal((await call('POST','owner-a',{action:'schedule',post:p})).status,200);assert.equal((await call('POST','owner-a',{action:'schedule',post:p})).status,200);
 assert.equal((await call('GET')).data.posts.length,1);
 const out=await Promise.all([call('POST','owner-a',{action:'run'}),call('POST','owner-a',{action:'run'})]);assert.equal(postCalls,1);assert.ok(out.some(r=>r.data.state==='published'));
 status=(await call('GET')).data;assert.equal(status.posts[0].remoteId,'urn:li:share:987654321');await call('POST','owner-a',{action:'run'});assert.equal(postCalls,1);
 p=post();mode='unknown';await call('POST','owner-a',{action:'schedule',post:p});assert.equal((await call('POST','owner-a',{action:'run'})).data.state,'uncertain');await call('POST','owner-a',{action:'run'});assert.equal(postCalls,2);
 p=post();mode='denied';await call('POST','owner-a',{action:'schedule',post:p});assert.equal((await call('POST','owner-a',{action:'run'})).data.state,'blocked');assert.equal(postCalls,3);
 p=post();await call('POST','owner-a',{action:'schedule',post:p});await call('POST','owner-b',{action:'cancel',id:p.id});assert.equal((await call('GET')).data.posts.find(x=>x.id===p.id).state,'scheduled');await call('POST','owner-a',{action:'cancel',id:p.id});await call('POST','owner-a',{action:'run'});assert.equal(postCalls,3);
 p=post();await call('POST','owner-a',{action:'schedule',post:p});await call('POST','owner-a',{action:'disconnect'});status=(await call('GET')).data;assert.equal(status.connected,false);assert.equal(status.posts.find(x=>x.id===p.id).state,'cancelled');assert.equal((await db.prepare('SELECT count(*) AS n FROM nexora_linkedin_accounts').first()).n,0);
 // Crash recovery must not re-execute a job whose partial completion is unknown.
 const stamp=new Date().toISOString();await db.prepare('INSERT INTO nexora_agent_jobs (id,owner,type,state,input,dedupe,lease,lease_until,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind('interrupted','owner-a','content','committing','{}','crash-qa','old','2000-01-01T00:00:00.000Z',stamp,stamp).run();await call('POST','owner-a',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'nexora_claim_work',arguments:{}}},undefined,'/mcp');assert.equal((await db.prepare('SELECT state FROM nexora_agent_jobs WHERE id=?').bind('interrupted').first()).state,'blocked');
 // An explicit owner-selected publication must never publish a different due post.
 mode='success';const reconnect=await connect();await call('GET','owner-a',null,undefined,'/api/linkedin/callback?state='+reconnect+'&code=qa');
 const older=post(),selected=post(),future={...post(),scheduledAt:new Date(Date.now()+3600000).toISOString()};
 for(const x of [older,selected,future])await call('POST','owner-a',{action:'schedule',post:x});
 const before=postCalls;
 assert.equal((await call('POST','owner-b',{action:'run',id:selected.id})).data.processed,0);
 assert.equal((await call('POST','owner-a',{action:'run',id:future.id})).data.processed,0);
 assert.equal((await call('POST','owner-a',{action:'run',id:'not-a-uuid'})).status,400);
 assert.equal(postCalls,before);
 assert.equal((await call('POST','owner-a',{action:'run',id:selected.id})).data.id,selected.id);
 assert.equal((await call('GET')).data.posts.find(x=>x.id===older.id).state,'scheduled');
 await call('POST','owner-a',{action:'run',id:selected.id});assert.equal(postCalls,before+1);
 mode='unknown';assert.equal((await call('POST','owner-a',{action:'run',id:older.id})).data.state,'uncertain');
 await call('POST','owner-a',{action:'run',id:older.id});assert.equal(postCalls,before+2);
 console.log('PASS: OAuth state owner/expiry/replay, encrypted token storage, auth/CSRF, isolated owners, approved snapshot, concurrent duplicate protection, confirmed post ID, unknown outcomes never retried, API denial, cancellation/disconnection and interrupted completion recovery. All LinkedIn HTTP is mocked.');
}finally{await mf.dispose();}
