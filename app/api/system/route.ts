import {env} from '@/lib/runtime';
import {authorize,reply,fail} from '@/lib/server';
import {n8nStatus} from '@/lib/n8n';
import {linkedinStatus} from '@/lib/linkedin';
import {networkStatus} from '@/lib/network';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{
 const u=await authorize(req),e=env as any;
 const results=await Promise.allSettled([n8nStatus(u.userId),linkedinStatus(u.userId),networkStatus(u.userId)]);
 const [r,p,n]=results.map(x=>x.status==='fulfilled'?x.value:null) as any[];
 const database=await (async()=>{try{await e.DB.prepare('SELECT 1 AS ok').first();return true;}catch{return false;}})();
 return reply({checkedAt:new Date().toISOString(),database,
 runner:r?{configured:r.configured,enabled:r.enabled,allowModel:r.allowModel,allowPosting:r.allowPosting,allowNetwork:r.allowNetwork,expiresAt:r.expiresAt,lastSeenAt:r.lastSeenAt}:null,
 posting:p?{connected:p.connected,canPublish:p.canPublish,expiresAt:p.account?.expiresAt||null,scopes:p.account?.scopes||[],receipts:p.posts.filter((x:any)=>x.state==='published').slice(0,5).map((x:any)=>({id:x.id,remoteId:x.remoteId,state:x.state,scheduledAt:x.scheduledAt}))}:null,
 network:n?{configured:n.configured,connected:n.connected,state:n.state,enabled:n.config?.enabled,lastSyncAt:n.lastSyncAt,receipts:(n.history||[]).slice(0,5).map((x:any)=>({id:x.id,state:x.state,kind:x.kind,receipt:x.receipt||null}))}:null,
 serverAI:{configured:!!(e.OPENAI_API_KEY&&e.OPENAI_MODEL),provider:'OpenAI',model:e.OPENAI_MODEL||null},
 note:'Runner enabled and authenticated checks do not prove a scheduled execution or successful model call. n8n credential configuration and scheduling are verified in n8n, not from this endpoint.'});
}catch(e){return fail(e);}}
