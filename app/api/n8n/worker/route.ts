import {reply,fail} from '@/lib/server';
import {n8nOwner,n8nWorker} from '@/lib/n8n';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{const auth=await n8nOwner(req);const text=await req.text();if(text.length>100000)return reply({error:'Request too large.'},413);return reply(await n8nWorker(auth,JSON.parse(text)));}catch(e:any){if(e.message==='N8N_AUTH')return reply({error:'Runner credential missing, expired or revoked.'},401);return fail(e);}}
