import {finishNetwork} from '@/lib/network';
import {reply} from '@/lib/server';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{const token=new URL(req.url).searchParams.get('token')||'',text=await req.text();if(token.length!==72||text.length>2000)return reply({error:'Invalid callback.'},400);return reply(await finishNetwork(token,JSON.parse(text)));}catch{return reply({error:'Connection callback could not be verified. Reconnect from your workspace.'},400)}}
