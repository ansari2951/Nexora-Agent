import {authorize,reply,fail} from '@/lib/server';
import {linkedinStatus,startLinkedin,disconnectLinkedin,schedulePost,cancelPost,runDuePosts} from '@/lib/linkedin';
import {z} from 'zod';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const u=await authorize(req);return reply(await linkedinStatus(u.userId));}catch(e){return fail(e);}}
export async function POST(req:Request){try{const u=await authorize(req,true),b:any=await req.json();switch(b.action){case 'connect':return reply(await startLinkedin(u.userId,new URL(req.url).origin));case 'disconnect':return reply(await disconnectLinkedin(u.userId));case 'schedule':return reply(await schedulePost(u.userId,b.post));case 'cancel':return reply(await cancelPost(u.userId,z.string().uuid().parse(b.id)));case 'run':return reply(await runDuePosts(u.userId,b.id===undefined?undefined:z.string().uuid().parse(b.id)));default:return reply({error:'Unknown LinkedIn action.'},400);}}catch(e){if(e instanceof z.ZodError)return reply({error:'Enter a post of 1–3000 characters, approval and a valid publication date.'},400);return fail(e);}}
