// Built Worker with disposable D1. OAuth and LinkedIn publishing are mocked.
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{Miniflare}=await import(createRequire(require.resolve('wrangler')).resolve('miniflare'));
const root=resolve('dist/server'),paths=readdirSync(root,{recursive:true}).filter(x=>/\.m?js$/.test(x));paths.sort((a,b)=>a==='index.js'?-1:b==='index.js'?1:a.localeCompare(b));
let published=0;
const mf=new Miniflare({modules:paths.map(p=>({type:'ESModule',path:resolve(root,p),contents:readFileSync(resolve(root,p),'utf8')})),modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'reviews-test'},cf:false,bindings:{LINKEDIN_CLIENT_ID:'qa-client',LINKEDIN_CLIENT_SECRET:'qa-secret',LINKEDIN_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,5).toString('base64'),LINKEDIN_API_VERSION:'202610'},outboundService:async req=>{const u=new URL(req.url);if(u.pathname==='/oauth/v2/accessToken')return Response.json({access_token:'QA-ONLY',expires_in:86400,scope:'openid profile w_member_social'});if(u.pathname==='/v2/userinfo')return Response.json({sub:'qa-subject',name:'QA Member'});if(u.pathname==='/rest/posts'){published++;return new Response(null,{status:201,headers:{'x-restli-id':'urn:li:share:qa-review'}});}throw Error('Unexpected outbound request');}});
try{
 const db=await mf.getD1Database('DB');for(const f of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())for(const s of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(s.trim())await db.prepare(s.trim()).run();
 async function call(path,method='GET',body,owner='a',origin='https://nexora.test'){const headers={'content-type':'application/json',origin};if(owner){headers['oai-authenticated-user-id']=owner;headers['oai-authenticated-user-email']=owner+'@example.test';}const r=await mf.dispatchFetch('https://nexora.test'+path,{method,headers,redirect:'manual',...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,location:r.headers.get('location'),data:r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text()};}
 const rec=async(kind,payload,id=crypto.randomUUID(),owner='a')=>{const r=await call('/api/records','POST',{id,kind,payload},owner);assert.equal(r.status,200,JSON.stringify(r));return id;};
 assert.match((await call('/signup','GET',null,null)).data,/Sign up with ChatGPT/);assert.match((await call('/login','GET',null,null)).data,/Continue with ChatGPT/);
 assert.equal((await call('/api/account','POST',{name:'QA Name'},null)).status,401);
 assert.equal((await call('/api/account','POST',{name:'QA Name'},'a','https://evil.test')).status,403);
 assert.equal((await call('/api/account','POST',{name:'QA Name',owner:'b'})).status,200);
 await call('/api/account','POST',{name:'Should not overwrite'});
 let own=(await call('/api/records')).data.records;assert.equal(own.find(x=>x.kind==='settings').payload.name,'QA Name');assert.equal((await call('/api/records','GET',null,'b')).data.records.length,0);
 const id=await rec('post',{topic:'QA topic',body:'This isolated draft must never reach a real account.',status:'Draft'});
 assert.equal((await call('/api/reviews','GET',null,null)).status,401);
 const request={action:'request',kind:'post',targetId:id};
 assert.equal((await call('/api/reviews','POST',request,'b')).status,400);
 assert.equal((await call('/api/reviews','POST',request,'a','https://evil.test')).status,403);
 const dup=await Promise.all([call('/api/reviews','POST',request),call('/api/reviews','POST',request)]);assert.ok(dup.every(x=>x.status===200));assert.equal(dup[0].data.id,dup[1].data.id);
 let rows=(await call('/api/reviews')).data.reviews;assert.equal(rows.length,1);assert.equal(rows[0].state,'pending');assert.equal((await call('/api/reviews','GET',null,'b')).data.reviews.length,0);assert.equal(published,0);
 let row=rows[0];const decide=(r,decision='approve',owner='a')=>call('/api/reviews','POST',{action:'decide',id:r.id,fingerprint:r.fingerprint,decision,expectedSubject:'qa-subject',scheduledAt:new Date(Date.now()-1000).toISOString()},owner);
 assert.equal((await decide(row,'approve','b')).status,400);
 assert.equal((await decide(row)).status,400,'Disconnected account cannot queue publication');assert.equal((await call('/api/reviews')).data.reviews[0].state,'pending');
 const start=await call('/api/linkedin','POST',{action:'connect'}),state=new URL(start.data.url).searchParams.get('state');assert.ok((await call('/api/linkedin/callback?state='+state+'&code=qa')).location.endsWith('linkedin=connected'));
 assert.equal((await call('/api/reviews','POST',{action:'decide',id:row.id,fingerprint:'0'.repeat(64),decision:'approve'})).status,400);
 assert.equal((await call('/api/reviews','POST',{action:'decide',id:row.id,fingerprint:row.fingerprint,decision:'approve',expectedSubject:'different-account'})).status,400,'Account must match the reviewed account');
 const approved=await Promise.all([decide(row),decide(row)]);assert.ok(approved.every(x=>x.status===200),JSON.stringify(approved));assert.equal((await call('/api/linkedin')).data.posts.length,1);assert.equal(published,0,'Approval queues; it never immediately posts');
 await call('/api/linkedin','POST',{action:'run'});await call('/api/linkedin','POST',{action:'run'});assert.equal(published,1);
 rows=(await call('/api/reviews')).data.reviews;assert.equal(rows[0].state,'published');assert.equal(rows[0].remoteId,'urn:li:share:qa-review');
 const alerts=(await call('/api/autonomy')).data.alerts;assert.ok(alerts.some(a=>a.id.startsWith('review:')));assert.ok(alerts.some(a=>a.title==='LinkedIn post published'));
 // An old approval must not authorize an edited post.
 const staleId=await rec('post',{topic:'Old QA',body:'Old exact QA text',status:'Draft'});await call('/api/reviews','POST',{...request,targetId:staleId});row=(await call('/api/reviews')).data.reviews.find(r=>r.targetId===staleId);await rec('post',{topic:'Changed QA',body:'Changed exact QA text',status:'Draft'},staleId);assert.equal((await decide(row)).status,400);
 const rejectId=await rec('post',{topic:'Reject QA',body:'Reject this text',status:'Draft'});await call('/api/reviews','POST',{...request,targetId:rejectId});row=(await call('/api/reviews')).data.reviews.find(r=>r.targetId===rejectId);await decide(row,'reject');assert.equal((await decide(row)).data.state,'rejected');assert.equal((await call('/api/linkedin')).data.posts.length,1);
 // Concurrent approval/rejection leaves exactly one outcome; rejected can never have a queued post.
 const raceId=await rec('post',{topic:'Race QA',body:'Concurrent decision QA',status:'Draft'});await call('/api/reviews','POST',{...request,targetId:raceId});row=(await call('/api/reviews')).data.reviews.find(r=>r.targetId===raceId);await Promise.all([decide(row,'reject'),decide(row)]);const raced=(await call('/api/reviews')).data.reviews.find(r=>r.id===row.id),racePost=(await call('/api/linkedin')).data.posts.find(p=>p.id===row.id);assert.ok(raced.approvalState==='rejected'||raced.approvalState==='queued');assert.equal(!!racePost,raced.approvalState==='queued');
 const leadId=await rec('lead',{name:'QA Prospect',role:'SEO Manager',company:'QA Agency',stage:'New',service:'Guest Posting',url:'https://linkedin.com/in/qa-review-only',profileText:'Verified disposable profile context for an isolated test, not a real prospect.',observation:'The example company publishes educational content about software.',sourceUrl:'https://example.com',verified:true,verifiedAt:new Date().toISOString(),messages:[],draftBody:'A reviewed suggestion which must never send itself.',draftType:'intro'});
 await call('/api/reviews','POST',{action:'request',kind:'message',targetId:leadId});row=(await call('/api/reviews')).data.reviews.find(r=>r.targetId===leadId);assert.equal((await decide(row)).data.state,'approved');assert.equal((await call('/api/records')).data.records.find(r=>r.id===leadId).payload.messages.length,0);
 assert.equal((await call('/api/records','POST',{id:row.id,kind:'review',payload:{state:'published'}})).status,400,'Generic records cannot forge approval states');
 const profileId=await rec('profile',{url:'https://linkedin.com/in/qa-owner',headline:'Current headline',suggestedHeadline:'Proposed headline'});await call('/api/reviews','POST',{action:'request',kind:'profile',targetId:profileId,section:'headline'});row=(await call('/api/reviews')).data.reviews.find(r=>r.targetId===profileId);assert.equal(row.payload.before,'Current headline');assert.equal((await decide(row)).data.state,'approved');assert.equal((await call('/api/records')).data.records.find(r=>r.id===profileId).payload.headline,'Current headline');
 console.log('PASS: separate signup/login, authenticated private registration, no settings reset, private approvals/notifications, CSRF, duplicate requests, exact snapshot validation, connection gate, atomic approve/reject race, queue-only approval, confirmed publication alerts and no automatic message/profile execution. All external calls mocked.');
}finally{await mf.dispose()}
