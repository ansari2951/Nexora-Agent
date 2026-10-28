import {authorize,reply,fail} from '@/lib/server';
import {controls,setControls,snapshot,prepare,requestWork,runApiCycle,stopJob,markSeen} from '@/lib/autonomy';
import {z} from 'zod';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const u=await authorize(req);return reply(await snapshot(u.userId));}catch(e){return fail(e);}}
export async function POST(req:Request){try{const u=await authorize(req,true);const b:any=await req.json();if(b.action==='request')return reply(await requestWork(u.userId,z.string().parse(b.task),z.string().parse(b.id)));if(b.action==='configure')return reply(await setControls(u.userId,b.config));if(b.action==='prepare')return reply(await prepare(u.userId));if(b.action==='run')return reply(await runApiCycle(u.userId));if(b.action==='cancel')return reply(await stopJob(u.userId,z.string().parse(b.id)));if(b.action==='seen')return reply(await markSeen(u.userId,z.string().parse(b.id)));return reply({error:'Unknown agent action.'},400);}catch(e){if(e instanceof z.ZodError)return reply({error:'Invalid agent settings or output.'},400);return fail(e);}}
