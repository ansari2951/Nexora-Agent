// Local D1 and mocked provider. No real account actions or secret credentials.
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{Miniflare}=await import(createRequire(require.resolve('wrangler')).resolve('miniflare'));
const root=resolve('dist/server'),paths=readdirSync(root,{recursive:true}).filter(x=>/\.m?js$/.test(x));paths.sort((a,b)=>a==='index.js'?-1:b==='index.js'?1:a.localeCompare(b));
let providerCalls=0,callback='',callbackName='',writes=0,mode='success',summary='Original About text for testing.',outbound=false,inbound=false;
const mf=new Miniflare({modules:paths.map(p=>({type:'ESModule',path:resolve(root,p),contents:readFileSync(resolve(root,p),'utf8')})),modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'network-test'},cf:false,bindings:{LINKEDIN_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,9).toString('base64')},outboundService:async req=>{
 providerCalls++;const u=new URL(req.url);assert.equal(u.hostname,'api1.unipile.com');assert.equal(req.headers.get('x-api-key'),'disposable-test-key');const path=u.pathname;
 if(path==='/api/v1/hosted/accounts/link'){const b=await req.json();callback=b.notify_url;callbackName=b.name;return Response.json({url:'https://account.unipile.com/disposable-qa-auth'});}
 if(path==='/api/v1/accounts/account-a')return Response.json({type:'LINKEDIN',id:'account-a',sources:[{id:'classic',status:'OK'}]});
 if(path==='/api/v1/users/me')return Response.json({provider:'LINKEDIN',public_identifier:'qa-owner',first_name:'QA',last_name:'Owner'});
 if(path==='/api/v1/users/qa-owner')return Response.json({provider:'LINKEDIN',public_identifier:'qa-owner',headline:'QA Owner',summary});
 if(path.startsWith('/api/v1/users/qa-prospect'))return Response.json({provider:'LINKEDIN',public_identifier:path.split('/').at(-1),provider_id:path.endsWith('qa-prospect')?'prospect-provider':'prospect-provider-2',network_distance:'DISTANCE_1',is_relationship:true});
 if(path==='/api/v1/chat_attendees')return Response.json({items:inbound||outbound?[{id:'attendee-1',account_id:'account-a',provider_id:'prospect-provider'}]:[],cursor:null});
 if(path==='/api/v1/chat_attendees/attendee-1/chats')return Response.json({items:[{id:'chat-1',account_id:'account-a'}],cursor:null});
 if(path==='/api/v1/chats/chat-1/messages'&&req.method==='GET')return Response.json({items:inbound?[{id:'reply-1',account_id:'account-a',is_sender:0,text:'Please do not contact me again.',timestamp:new Date().toISOString()}]:outbound?[{id:'message-1',account_id:'account-a',is_sender:1,text:'Saved QA first message',timestamp:new Date().toISOString()}]:[],cursor:null});
 if(path==='/api/v1/users/relations')return Response.json({items:[{first_name:'QA',last_name:'Prospect',public_profile_url:'https://linkedin.com/in/qa-prospect',public_identifier:'qa-prospect',member_id:'prospect-provider',headline:'SEO manager'}],cursor:null});
 if(path==='/api/v1/chats'&&req.method==='POST'){writes++;const b=await req.formData();assert.equal(b.get('account_id'),'account-a');assert.ok(String(b.get('attendees_ids')).startsWith('prospect-provider'));if(mode==='unknown')return new Response(null,{status:503});outbound=true;return Response.json({chat_id:'chat-1',message_id:'message-1'});}
 if(path==='/api/v1/users/me/edit'){writes++;const b=await req.formData();assert.equal(b.get('account_id'),'account-a');summary=b.get('summary');return Response.json({object:'AccountOwnerProfileEdited'});}
 throw Error('Unexpected mocked provider request '+req.method+' '+path);
}});
try{
 const db=await mf.getD1Database('DB');for(const f of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
 const api=async(owner,path,body,origin='https://nexora.test')=>{const r=await mf.dispatchFetch('https://nexora.test'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',origin,...(owner?{'oai-authenticated-user-id':owner,'oai-authenticated-user-email':owner+'@example.test'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()}};
 const network=(owner,body)=>api(owner,'/api/network',body),save=async(record)=>{const r=await api('owner-a','/api/records',record);assert.equal(r.status,200,JSON.stringify(r));};
 assert.equal((await network(null)).status,401);assert.equal((await api('owner-a','/api/network',{action:'credentials'},'https://evil.test')).status,403);
 assert.equal((await network('owner-a',{action:'credentials',apiBase:'https://evil.test',apiKey:'disposable-test-key'})).status,400);
 assert.equal((await network('owner-a',{action:'credentials',apiBase:'https://api1.unipile.com',apiKey:'disposable-test-key'})).status,200);
 assert.ok(!JSON.stringify((await network('owner-a')).data).includes('disposable-test-key'));
 assert.ok(!(await db.prepare('SELECT encrypted_key FROM nexora_network_accounts').first()).encrypted_key.includes('disposable-test-key'));
 const profile={id:crypto.randomUUID(),kind:'profile',payload:{name:'QA Owner',url:'https://linkedin.com/in/qa-owner',about:summary,suggestedAbout:'Approved replacement About section for QA.'}};await save(profile);
 assert.equal((await network('owner-a',{action:'connect'})).status,200);
 const notify=async(body,url=callback)=>{const r=await mf.dispatchFetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()}};
 assert.equal((await notify({status:'CREATION_SUCCESS',name:callbackName,account_id:'account-a'},callback.replace('token=','token=bad'))).status,400);
 assert.equal((await notify({status:'CREATION_SUCCESS',name:callbackName,account_id:'account-a'})).status,200);
 assert.equal((await notify({status:'CREATION_SUCCESS',name:callbackName,account_id:'account-a'})).status,400,'Callbacks are single use');
 assert.equal((await network('owner-a')).data.connected,true);assert.equal((await network('owner-b')).data.connected,false);
 assert.equal((await network('owner-a',{action:'configure',config:{enabled:true,autoMessages:false,autoInvites:false,autoAccept:false,dailyLimit:5}})).status,200);
 // Owner-scoped no-provider mode blocks provider HTTP without changing official posting.
 assert.equal((await api(null,'/api/workflow')).status,401);
 assert.equal((await api('owner-a','/api/workflow',{action:'no_provider'},'https://evil.test')).status,403);
 const beforeMode=providerCalls;
 assert.equal((await api('owner-a','/api/workflow',{action:'no_provider'})).status,200);
 assert.equal((await api('owner-a','/api/workflow')).data.noPaidProvider,true);
 assert.equal((await api('owner-b','/api/workflow')).data.noPaidProvider,false);
 assert.equal((await api('owner-a','/api/agent',{task:'message',id:'unused'})).status,409,'Direct model calls disabled in no-provider workflow');
 const rules=(await api('owner-a','/api/workflow')).data.followups;
 assert.equal(rules.followupDays,2);assert.equal(rules.followupUnit,'calendar');
 assert.equal((await network('owner-a',{action:'sync'})).status,400);
 assert.equal((await network('owner-a',{action:'credentials',apiBase:'https://api1.unipile.com',apiKey:'disposable-test-key'})).status,400);
 await network('owner-a',{action:'run'});
 assert.equal(providerCalls,beforeMode,'No-provider activation and blocked requests make no provider HTTP calls');assert.equal(writes,0);
 assert.equal((await api('owner-a','/api/workflow',{action:'optional_provider'})).status,200);
 assert.equal((await network('owner-a')).data.config.enabled,false,'Choosing optional setup never enables sending');
 await network('owner-a',{action:'configure',config:{enabled:true,autoMessages:false,autoInvites:false,autoAccept:false,dailyLimit:5}});
 assert.equal((await network('owner-a',{action:'sync'})).data.imported,1);let recs=(await api('owner-a','/api/records')).data.records,lead=recs.find(x=>x.kind==='lead');
 assert.equal((await api('owner-b','/api/records')).data.records.length,0);
 lead.payload={...lead.payload,profileText:'Verified disposable profile research for exact owner tests.',company:'QA Agency',observation:'QA agency offers SEO content services for software businesses.',sourceUrl:'https://example.com/agency',verified:true,verifiedAt:new Date().toISOString(),draftBody:'Saved QA first message',draftType:'intro'};await save(lead);
 const review=async(kind,targetId,section)=>{let r=await api('owner-a','/api/reviews',{action:'request',kind,targetId,section});assert.equal(r.status,200,JSON.stringify(r));let row=(await api('owner-a','/api/reviews')).data.reviews.find(x=>x.id===r.data.id);r=await api('owner-a','/api/reviews',{action:'decide',id:row.id,fingerprint:row.fingerprint,decision:'approve'});assert.equal(r.status,200);return row;};
 const mr=await review('message',lead.id);
 assert.equal((await network('owner-b',{action:'queue_review',id:mr.id})).status,400);
 assert.equal((await network('owner-a',{action:'queue_review',id:mr.id})).status,200);
 const send=await network('owner-a',{action:'run'});assert.equal(send.data.state,'completed',JSON.stringify(send));assert.equal(writes,1);
 await network('owner-a',{action:'run'});assert.equal(writes,1,'Confirmed message cannot be resent');
 recs=(await api('owner-a','/api/records')).data.records;assert.equal(recs.find(x=>x.id===lead.id).payload.messages[0].remoteId,'message-1');
 const pr=await review('profile',profile.id,'about');await network('owner-a',{action:'queue_review',id:pr.id});
 const edit=await network('owner-a',{action:'run'});assert.equal(edit.data.state,'completed',JSON.stringify(edit));assert.equal(summary,profile.payload.suggestedAbout);assert.equal(writes,2);
 // A live opt-out suppresses an already-approved follow-up before any write.
 recs=(await api('owner-a','/api/records')).data.records;lead=recs.find(x=>x.kind==='lead');lead.payload.messages[0].at=new Date(Date.now()-4*86400000).toISOString();lead.payload.draftBody='QA polite follow-up for a prior sent message.';lead.payload.draftType='followup';await save(lead);const fr=await review('message',lead.id);await network('owner-a',{action:'queue_review',id:fr.id});inbound=true;
 const stop=await network('owner-a',{action:'run'});assert.ok(['blocked','cancelled'].includes(stop.data.state),JSON.stringify(stop));assert.equal(writes,2);
 assert.equal((await api('owner-a','/api/records')).data.records.find(x=>x.kind==='lead').payload.stage,'Do not contact');
 // Ambiguous writes stay terminal and concurrent runs share an owner lock.
 inbound=false;outbound=false;mode='unknown';
 const second={...lead,id:crypto.randomUUID(),payload:{...lead.payload,name:'QA second prospect',url:'https://linkedin.com/in/qa-prospect-2',stage:'New',messages:[],draftType:'intro',draftBody:'Second QA exact researched message.'}};await save(second);
 const ur=await review('message',second.id);await network('owner-a',{action:'queue_review',id:ur.id});
 const parallel=await Promise.all([network('owner-a',{action:'run'}),network('owner-a',{action:'run'})]);assert.ok(parallel.some(r=>r.data.state==='uncertain'),JSON.stringify(parallel));assert.equal(writes,3);
 await network('owner-a',{action:'run'});assert.equal(writes,3,'Unknown provider send cannot be retried');
 assert.equal((await network('owner-a')).data.history.find(x=>x.kind==='message'&&x.targetId===second.id).state,'uncertain');
 await network('owner-a',{action:'configure',config:{enabled:true,autoMessages:false,autoInvites:false,autoAccept:false,dailyLimit:1}});
 assert.equal((await network('owner-a',{action:'run'})).data.reason,'Daily network action limit reached.');assert.equal(writes,3);
 await network('owner-a',{action:'disconnect'});assert.equal((await network('owner-a')).data.connected,false);
 console.log('PASS: encrypted provider key, DSN allowlist, auth/CSRF, verified single-use callback, owner isolation, paged connection import, exact approved send and profile readback, duplicate prevention and live reply suppression. All provider requests mocked.');
}finally{await mf.dispose()}
