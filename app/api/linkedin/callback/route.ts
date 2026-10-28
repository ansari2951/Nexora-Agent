import {authorize} from '@/lib/server';
import {completeLinkedin} from '@/lib/linkedin';
export const dynamic='force-dynamic';
export async function GET(req:Request){const url=new URL(req.url);let result='connected';try{const u=await authorize(req);await completeLinkedin(u.userId,url);}catch{result='error';}return new Response(null,{status:303,headers:{Location:url.origin+'/?linkedin='+result,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}
