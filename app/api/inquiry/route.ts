import {reply} from '@/lib/server';
import {publicIntake,submitIntake} from '@/lib/intake';
import {z} from 'zod';
export const dynamic='force-dynamic';
function token(req:Request){return req.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1]||'';}
export async function GET(req:Request){const status=await publicIntake(token(req));return status?reply(status):reply({error:'This link is unavailable. Request a new private link from your contact.'},404);}
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Open the form from the original link.'},403);
 try{const raw=await req.text();if(raw.length>20000)return reply({error:'Brief too large.'},413);return reply(await submitIntake(token(req),JSON.parse(raw)));}
 catch(e){if(e instanceof z.ZodError||e instanceof SyntaxError)return reply({error:'Check the required fields and your permission to share this brief.'},400);return reply({error:e instanceof Error&&e.message.startsWith('VALIDATION:')?e.message.slice(11):'Submission could not be confirmed. Retry with the same unchanged brief.'},400);}
}
