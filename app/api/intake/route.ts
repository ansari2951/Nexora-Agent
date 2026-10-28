import {authorize,reply,fail} from '@/lib/server';
import {createIntake,listIntakes,revokeIntake} from '@/lib/intake';
import {z} from 'zod';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const u=await authorize(req),lead=z.string().min(1).max(100).parse(new URL(req.url).searchParams.get('leadId'));return reply(await listIntakes(u.userId,lead));}catch(e){return fail(e);}}
export async function POST(req:Request){try{const u=await authorize(req,true);const raw=await req.text();if(raw.length>5000)return reply({error:'Request too large.'},413);const b=JSON.parse(raw);if(b.action==='create')return reply(await createIntake(u.userId,b.link,new URL(req.url).origin));if(b.action==='revoke')return reply(await revokeIntake(u.userId,b.id));return reply({error:'Unknown action.'},400);}catch(e){if(e instanceof z.ZodError)return reply({error:'Invalid client link request.'},400);return fail(e);}}
