import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {prepare} from './autonomy';

const uuid=z.string().uuid();
const tokenSchema=z.string().regex(/^[a-f0-9]{64}$/);
const text=(n=1000)=>z.string().trim().max(n);
const site=z.string().trim().max(2000).url().refine(v=>['http:','https:'].includes(new URL(v).protocol),'Use an HTTP or HTTPS website');
export const intakeSchema=z.object({
 submissionId:uuid,consent:z.literal(true),name:text(150).min(2),company:text(200),website:site,
 service:z.enum(['Guest Posting','Link Building','Article Writing','SEO','GEO','AEO']),
 niche:text(300).min(2),country:text(200).min(2),quantity:text(200),budget:text(200),
 currency:z.enum(['USD','GBP','EUR','PKR','AED','SAR']),deadline:text(200),
 targetUrls:text(3000),anchors:text(1500),criteria:text(2000),content:text(2000),note:text(3000),
}).strict();
const db=()=> (env as any).DB as D1Database;
const stamp=()=>new Date().toISOString();
const issue=(m:string)=>new Error('VALIDATION: '+m);
const activeLead="r.kind='lead' AND COALESCE(json_extract(r.payload,'$.stage'),'') NOT IN ('Do not contact','Paused')";
async function digest(s:string){const a=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(a),x=>x.toString(16).padStart(2,'0')).join('');}
function cleanLink(l:any){return {id:l.id,state:l.state,expiresAt:l.expires_at,createdAt:l.created_at,submittedAt:l.submitted_at,submission:l.submission?JSON.parse(l.submission):null};}
export async function listIntakes(owner:string,leadId:string){
 const rows=await db().prepare('SELECT * FROM nexora_intake_links WHERE owner=? AND lead_id=? ORDER BY created_at DESC LIMIT 20').bind(owner,leadId).all();
 return {links:rows.results.map(cleanLink)};
}
export async function createIntake(owner:string,input:unknown,origin:string){
 const p=z.object({id:uuid,leadId:z.string().min(1).max(100),token:tokenSchema}).strict().parse(input);
 const lead=await db().prepare(`SELECT id FROM nexora_records r WHERE r.owner=? AND r.id=? AND ${activeLead}`).bind(owner,p.leadId).first();
 if(!lead)throw issue('Save an active prospect before creating a client link.');
 const hash=await digest(p.token),existing:any=await db().prepare('SELECT * FROM nexora_intake_links WHERE id=?').bind(p.id).first();
 if(existing){if(existing.owner!==owner||existing.lead_id!==p.leadId||existing.token_hash!==hash)throw issue('This link identifier is unavailable.');if(existing.state!=='open'||existing.expires_at<=stamp())throw issue('Create a new link; the earlier one is no longer open.');return {url:origin+'/inquiry#'+p.token,expiresAt:existing.expires_at};}
 const now=stamp(),expires=new Date(Date.now()+7*86400000).toISOString();
 await db().batch([
  db().prepare("UPDATE nexora_intake_links SET state='revoked' WHERE owner=? AND lead_id=? AND state='open'").bind(owner,p.leadId),
  db().prepare("INSERT INTO nexora_intake_links(id,owner,lead_id,token_hash,state,expires_at,created_at) VALUES(?,?,?,?,'open',?,?)").bind(p.id,owner,p.leadId,hash,expires,now),
 ]);
 return {url:origin+'/inquiry#'+p.token,expiresAt:expires};
}
export async function revokeIntake(owner:string,id:string){
 await db().prepare("UPDATE nexora_intake_links SET state='revoked' WHERE owner=? AND id=? AND state='open'").bind(owner,uuid.parse(id)).run();return {revoked:true};
}
async function tokenRow(raw:string){
 if(!tokenSchema.safeParse(raw).success)return null;
 return await db().prepare('SELECT * FROM nexora_intake_links WHERE token_hash=?').bind(await digest(raw)).first() as any;
}
async function usableLead(l:any){return !!(await db().prepare(`SELECT id FROM nexora_records r WHERE r.owner=? AND r.id=? AND ${activeLead}`).bind(l.owner,l.lead_id).first());}
export async function publicIntake(raw:string){
 const l=await tokenRow(raw);
 if(!l||l.state==='revoked'||l.expires_at<=stamp()||!await usableLead(l))return null;
 return {state:l.state,expiresAt:l.expires_at};
}
export async function submitIntake(raw:string,input:unknown){
 const p=intakeSchema.parse(input),l=await tokenRow(raw),now=stamp();
 if(!l||l.state==='revoked'||l.expires_at<=now||!await usableLead(l))throw issue('This link is unavailable. Request a new link from your contact.');
 const payload=JSON.stringify(p),hash=await digest(payload);
 if(l.state==='submitted'){
  if(l.submission_id===p.submissionId&&l.submission_hash===hash)return {received:true,receipt:l.id};
  throw issue('This link has already received a brief. Request a new link for revisions.');
 }
 if(l.state!=='open')throw issue('This link is unavailable.');
 // Every statement rechecks the same open link and active lead inside one D1
 // atomic batch. A concurrent request can never append a second message/alert.
 const gate=`EXISTS(SELECT 1 FROM nexora_intake_links l JOIN nexora_records r ON r.owner=l.owner AND r.id=l.lead_id WHERE l.id=? AND l.state='open' AND l.expires_at>? AND ${activeLead})`;
 const keys=['niche','country','quantity','budget','currency','deadline','targetUrls','anchors','criteria','content'] as const;
 let updated="json_set(payload,'$.requirements',json(COALESCE(json_extract(payload,'$.requirements'),'{}')),'$.messages',json(COALESCE(json_extract(payload,'$.messages'),'[]')))";
 const values:unknown[]=[];
 for(const k of keys){updated=`json_set(${updated},'$.requirements.${k}',CASE WHEN COALESCE(json_extract(payload,'$.requirements.${k}'),'')='' THEN ? ELSE json_extract(payload,'$.requirements.${k}') END)`;values.push(p[k]);}
 const message={id:'intake:'+l.id,direction:'inbound',at:now,body:'Campaign brief submitted through a private requirement link. Submitter identity has not been independently verified. This is an inquiry, not order acceptance or payment.\n'+payload};
 updated=`json_set(json_insert(${updated},'$.messages[#]',json(?)),'$.lastIntakeId',?,'$.intakeService',?,'$.service',CASE WHEN json_extract(payload,'$.stage') IN ('New','Ready','Researching','Contacted','Replied') THEN ? ELSE json_extract(payload,'$.service') END,'$.stage',CASE WHEN json_extract(payload,'$.stage') IN ('New','Ready','Researching','Contacted') THEN 'Replied' ELSE json_extract(payload,'$.stage') END)`;
 values.push(JSON.stringify(message),l.id,p.service,p.service);
 const alertBody=`${p.name}${p.company?' / '+p.company:''} submitted ${p.service} requirements. Quantity: ${p.quantity||'unknown'}. Stated budget: ${p.budget?p.budget+' '+p.currency:'unknown'}. Review the client brief before quoting. No order or payment confirmed.`;
 const results=await db().batch([
  db().prepare(`UPDATE nexora_records SET payload=${updated},updated_at=? WHERE owner=? AND id=? AND kind='lead' AND ${gate}`).bind(...values,now,l.owner,l.lead_id,l.id,now),
  db().prepare(`INSERT INTO nexora_agent_alerts(id,owner,title,body,target_id,seen,created_at) SELECT ?,?,'Client requirements received',?,?,0,? WHERE ${gate}`).bind('intake:'+l.id,l.owner,alertBody,l.lead_id,now,l.id,now),
  db().prepare(`UPDATE nexora_intake_links SET state='submitted',submission_id=?,submission_hash=?,submission=?,submitted_at=? WHERE id=? AND state='open' AND ${gate}`).bind(p.submissionId,hash,payload,now,l.id,l.id,now),
 ]);
 if(!results[2].meta.changes){
  const latest=await tokenRow(raw);
  if(latest?.submission_id!==p.submissionId||latest?.submission_hash!==hash)throw issue('This link is no longer open. Refresh before trying again.');
 }
 // Research, replies and proposals remain deduplicated internal work. Never
 // delay a successful submission on an optional planning failure.
 try{await prepare(l.owner);}catch{}
 return {received:true,receipt:l.id};
}
