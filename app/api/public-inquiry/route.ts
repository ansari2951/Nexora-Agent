import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {reply} from '@/lib/server';
export const dynamic='force-dynamic';
const schema=z.object({submissionId:z.string().uuid(),name:z.string().trim().min(2).max(150),email:z.string().trim().email().max(254),company:z.string().trim().max(200),website:z.string().trim().url().max(2000).refine(v=>['http:','https:'].includes(new URL(v).protocol)),service:z.enum(['Guest Posting','Link Building','Article Writing','SEO / GEO / AEO']),country:z.string().trim().max(200),brief:z.string().trim().min(20).max(3000),consent:z.literal(true),companyFax:z.string().max(200).default('')}).strict();
async function digest(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,'0')).join('');}
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Please use the form on this website.'},403);
 try{
  const raw=await req.text();if(raw.length>12000)return reply({error:'Please shorten your brief.'},413);
  const p=schema.parse(JSON.parse(raw));if(p.companyFax)return reply({error:'Submission could not be accepted.'},400);
  const config=env as any,owner=String(config.NEXORA_OWNER_WORKSPACE_ID||'');if(!owner||!config.DB)return reply({error:'The inquiry form is temporarily unavailable. Please use the email link.'},503);
  const db=config.DB as D1Database,id='inbound:'+p.submissionId,hash=await digest(JSON.stringify(p)),stamp=new Date().toISOString();
  const prior:any=await db.prepare('SELECT payload FROM nexora_records WHERE id=? AND owner=? AND kind=\'lead\'').bind(id,owner).first();
  if(prior)return JSON.parse(prior.payload).inboundHash===hash?reply({received:true,receipt:p.submissionId}):reply({error:'This submission changed. Start a new inquiry.'},409);
  const email=p.email.toLowerCase();
  const suppressed=await db.prepare("SELECT id FROM nexora_records WHERE owner=? AND kind='lead' AND lower(json_extract(payload,'$.contactEmail'))=? AND json_extract(payload,'$.stage')='Do not contact'").bind(owner,email).first();
  if(suppressed)return reply({received:true,receipt:p.submissionId});
  const rateHash=await digest(owner+stamp.slice(0,10)+(req.headers.get('cf-connecting-ip')||'unavailable'));
  const service=p.service==='SEO / GEO / AEO'?'SEO':p.service;
  const payload=JSON.stringify({name:p.name,company:p.company,website:p.website,url:'',role:'To verify',service,stage:'Replied',profileText:'',observation:'',sourceUrl:'',verified:false,researchStatus:'Not researched',contactEmail:email,contactEmailVerified:false,inbound:true,inboundSource:'Public Work with Faizan form',inboundHash:hash,inboundRateHash:rateHash,requirements:{country:p.country,currency:''},notes:'Requested service: '+p.service,messages:[{id,at:stamp,direction:'inbound',body:'Public website inquiry. Contact identity and email ownership are unverified; this is not an order or payment.\nRequested service: '+p.service+'\nWebsite: '+p.website+'\nTarget audience: '+(p.country||'To confirm')+'\nBrief: '+p.brief}]});
  const since=new Date(Date.now()-3600000).toISOString();
  await db.batch([
   db.prepare("INSERT INTO nexora_records(id,owner,kind,payload,dedupe,created_at,updated_at) SELECT ?,?,'lead',?,?,?,? WHERE (SELECT count(*) FROM nexora_records WHERE owner=? AND kind='lead' AND json_extract(payload,'$.inbound')=1 AND created_at>=?)<20 AND (SELECT count(*) FROM nexora_records WHERE owner=? AND kind='lead' AND json_extract(payload,'$.inboundRateHash')=? AND created_at>=?)<5 ON CONFLICT DO NOTHING").bind(id,owner,payload,id,stamp,stamp,owner,since,owner,rateHash,since),
   db.prepare("INSERT INTO nexora_agent_alerts(id,owner,title,body,target_id,seen,created_at) SELECT ?,?,'New inbound inquiry',?,?,0,? WHERE EXISTS (SELECT 1 FROM nexora_records WHERE id=? AND owner=? AND json_extract(payload,'$.inboundHash')=?) ON CONFLICT DO NOTHING").bind(id,owner,p.name+' requested '+p.service+'. Review the submitted brief; identity, scope and budget need confirmation.',id,stamp,id,owner,hash)
  ]);
  const saved=await db.prepare('SELECT id FROM nexora_records WHERE id=? AND owner=?').bind(id,owner).first();
  return saved?reply({received:true,receipt:p.submissionId}):reply({error:'Too many inquiries right now. Please try later or use the email link.'},429);
 }catch(e){if(e instanceof z.ZodError||e instanceof SyntaxError)return reply({error:'Check your name, email, website, brief and consent.'},400);return reply({error:'Receipt could not be confirmed. Retry the same unchanged inquiry.'},500);}
}
