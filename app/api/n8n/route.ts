import {authorize,reply,fail} from '@/lib/server';
import {n8nStatus,createN8nToken,configureN8n,revokeN8n} from '@/lib/n8n';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const u=await authorize(req);return reply(await n8nStatus(u.userId));}catch(e){return fail(e);}}
export async function POST(req:Request){try{const u=await authorize(req,true);const text=await req.text();if(text.length>2000)return reply({error:'Request too large.'},413);const b=JSON.parse(text);if(b.action==='create')return reply(await createN8nToken(u.userId));if(b.action==='revoke')return reply(await revokeN8n(u.userId));if(b.action==='configure'&&typeof b.enabled==='boolean'&&typeof b.allowModel==='boolean')return reply(await configureN8n(u.userId,b.enabled,b.allowModel,typeof b.allowPosting==='boolean'?b.allowPosting:undefined,typeof b.allowNetwork==='boolean'?b.allowNetwork:undefined));return reply({error:'Invalid runner settings.'},400);}catch(e){return fail(e);}}
