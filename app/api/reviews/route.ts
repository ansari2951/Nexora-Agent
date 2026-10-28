import {authorize,reply,fail} from '@/lib/server';
import {requestReview,reviewInbox,decideReview} from '@/lib/reviews';
import {z} from 'zod';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const u=await authorize(req);return reply({reviews:await reviewInbox(u.userId)});}catch(e){return fail(e);}}
export async function POST(req:Request){try{const u=await authorize(req,true);if(Number(req.headers.get('content-length')||0)>10000)return reply({error:'Request too large.'},413);const b:any=await req.json();if(b.action==='request')return reply(await requestReview(u.userId,b));if(b.action==='decide')return reply(await decideReview(u.userId,b));return reply({error:'Unknown approval action.'},400);}catch(e){if(e instanceof z.ZodError)return reply({error:'Invalid approval request. Refresh and try again.'},400);return fail(e);}}
