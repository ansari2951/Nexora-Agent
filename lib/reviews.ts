import {env} from 'cloudflare:workers';
import {getDb} from '@/db';
import {reviews,records,agentAlerts,linkedinPosts,networkActions} from '@/db/schema';
import {eq,and,desc,sql} from 'drizzle-orm';
import {z} from 'zod';
import {linkedinStatus} from './linkedin';
import {researchGaps,safeLink} from './engine.mjs';
const issue=(s:string)=>new Error('VALIDATION: '+s);
const kind=z.enum(['post','message','profile']);
const section=z.enum(['headline','about','experience','featured','posts']);
export async function reviewHash(value:unknown){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function reviewSource(owner:string,type:string,targetId:string,field?:string){
 const row=(await getDb().select().from(records).where(and(eq(records.owner,owner),eq(records.id,targetId))))[0];
 if(!row||row.kind!==({post:'post',message:'lead',profile:'profile'} as any)[type])throw issue('Save the matching record in your own workspace first.');
 const p=JSON.parse(row.payload);let snapshot:any;
 if(type==='post'){if(!p.body?.trim()||p.body.trim().length>3000)throw issue('Save a post of 1–3000 characters first.');snapshot={title:p.topic||'LinkedIn post',body:p.body.trim(),url:''};}
 else if(type==='message'){
  if(['Do not contact','Paused','Delivered'].includes(p.stage))throw issue('This prospect is paused or suppressed.');
  if(researchGaps(p).length)throw issue('Verified profile research is required before message approval.');
  if(!p.draftBody?.trim()||p.draftBody.trim().length>3000)throw issue('Save a message draft of 1–3000 characters first.');
  snapshot={title:p.name,body:p.draftBody.trim(),url:safeLink(p.url)||'',draftType:p.draftType||'intro',conversation:JSON.stringify((p.messages||[]).map((m:any)=>({id:m.id,direction:m.direction,body:m.body,at:m.at})))};
 }else{const f=section.parse(field),after=p['suggested'+f[0].toUpperCase()+f.slice(1)];if(!p[f]?.trim()||!after?.trim())throw issue('Save both the current section and proposed version first.');snapshot={title:f,body:after,before:p[f],url:safeLink(p.url)||'',section:f};}
 return {snapshot,sourcePayload:row.payload};
}
export async function requestReview(owner:string,input:unknown){
 const b=z.object({kind,targetId:z.string().min(1).max(200),section:section.optional()}).parse(input),{snapshot}=await reviewSource(owner,b.kind,b.targetId,b.section),fingerprint=await reviewHash({kind:b.kind,targetId:b.targetId,snapshot}),db=getDb(),stamp=new Date().toISOString(),id=crypto.randomUUID();
 await db.insert(reviews).values({id,owner,kind:b.kind,targetId:b.targetId,section:b.section||null,fingerprint,payload:JSON.stringify(snapshot),state:'pending',createdAt:stamp,updatedAt:stamp}).onConflictDoNothing();
 const saved=(await db.select().from(reviews).where(and(eq(reviews.owner,owner),eq(reviews.fingerprint,fingerprint))))[0];
 await db.insert(agentAlerts).values({id:'review:'+saved.id,owner,title:'Approval needed: '+b.kind,body:snapshot.title+' is ready for your review. Nothing has been sent, changed or published.',targetId:saved.id,seen:0,createdAt:stamp}).onConflictDoNothing();
 return {id:saved.id,state:saved.state};
}
export async function reviewInbox(owner:string){
 const db=getDb(),rows=await db.select().from(reviews).where(eq(reviews.owner,owner)).orderBy(desc(reviews.createdAt)).limit(200),published=await db.select().from(linkedinPosts).where(eq(linkedinPosts.owner,owner));
 const executions=await db.select().from(networkActions).where(eq(networkActions.owner,owner));return rows.map(r=>{const p=JSON.parse(r.payload);delete p.conversation;const post=published.find(x=>x.id===r.postId);const executed=executions.find(x=>JSON.parse(x.payload).reviewId===r.id);return {...r,executionState:executed?.state||null,executionReason:executed?.reason||null,executionReceipt:executed?.receipt||null,payload:p,state:post?.state||r.state,approvalState:r.state,publicationReason:post?.reason||null,remoteId:post?.remoteId||null};});
}
export async function decideReview(owner:string,input:unknown){
 const b=z.object({id:z.string().uuid(),decision:z.enum(['approve','reject']),fingerprint:z.string().length(64),scheduledAt:z.string().datetime().optional(),expectedSubject:z.string().max(200).optional()}).parse(input),db=getDb(),r=(await db.select().from(reviews).where(and(eq(reviews.owner,owner),eq(reviews.id,b.id))))[0];
 if(!r)throw issue('Approval request is not available in your workspace.');
 if(r.fingerprint!==b.fingerprint)throw issue('Refresh this approval before deciding.');
 if(r.state!=='pending')return {state:r.state,id:r.id};
 if(b.decision==='reject'){await db.update(reviews).set({state:'rejected',updatedAt:new Date().toISOString()}).where(and(eq(reviews.owner,owner),eq(reviews.id,r.id),eq(reviews.state,'pending')));return {state:(await db.select().from(reviews).where(eq(reviews.id,r.id)))[0].state,id:r.id};}
 const {snapshot:current,sourcePayload}=await reviewSource(owner,r.kind,r.targetId,r.section||undefined);
 if(await reviewHash({kind:r.kind,targetId:r.targetId,snapshot:current})!==r.fingerprint)throw issue('The draft or conversation changed. Request a new review for the latest version.');
 if(r.kind!=='post'){
  await db.update(reviews).set({state:'approved',updatedAt:new Date().toISOString()}).where(and(eq(reviews.owner,owner),eq(reviews.id,r.id),eq(reviews.state,'pending'),sql`EXISTS (SELECT 1 FROM nexora_records WHERE owner=${owner} AND id=${r.targetId} AND payload=${sourcePayload})`));
  const decided=(await db.select().from(reviews).where(and(eq(reviews.owner,owner),eq(reviews.id,r.id))))[0];if(decided.state==='pending')throw issue('Source changed during approval. Request a new review.');return {state:decided.state,id:r.id,reason:'Approval saved only. No execution integration is connected for this action.'};
 }
 const connection=await linkedinStatus(owner);if(!connection.canPublish||!connection.account)throw issue('Connect LinkedIn posting permission before approving publication. This request remains pending.');
 if(b.expectedSubject!==connection.account.subject)throw issue('The connected account changed or was not reviewed. Refresh approvals and check the posting account.');
 const date=b.scheduledAt||new Date().toISOString();if(Date.parse(date)>Date.now()+90*86400000||Date.parse(date)>Date.parse(connection.account.expiresAt))throw issue('Choose a date within 90 days and before authorization expires.');
 const stamp=new Date().toISOString(),d1=(env as any).DB;
 // One transaction: a concurrent rejection must never leave a publishable post.
 await d1.batch([
  d1.prepare("UPDATE nexora_reviews SET state='queued',scheduled_at=?,post_id=id,subject=?,updated_at=? WHERE owner=? AND id=? AND state='pending' AND fingerprint=? AND EXISTS (SELECT 1 FROM nexora_records WHERE owner=? AND id=? AND payload=?) AND NOT EXISTS (SELECT 1 FROM nexora_linkedin_posts WHERE id=?)").bind(date,connection.account.subject,stamp,owner,r.id,r.fingerprint,owner,r.targetId,sourcePayload,r.id),
  d1.prepare("INSERT INTO nexora_linkedin_posts (id,owner,body,state,scheduled_at,subject,created_at,updated_at) SELECT id,owner,?,'scheduled',scheduled_at,subject,?,? FROM nexora_reviews WHERE owner=? AND id=? AND state='queued' ON CONFLICT(id) DO NOTHING").bind(current.body,stamp,stamp,owner,r.id),
 ]);
 const saved=(await db.select().from(reviews).where(and(eq(reviews.owner,owner),eq(reviews.id,r.id))))[0];if(saved.state==='pending')throw issue('Source changed during approval. Request a new review.');return {id:r.id,state:saved.state};
}
