import {linkedinStatus} from '@/lib/linkedin';
import { env } from 'cloudflare:workers';
import { authorize,reply,fail } from '@/lib/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const u=await authorize(req);const e=env as any,linkedin=await linkedinStatus(u.userId);return reply({aiConfigured:!!(e.OPENAI_API_KEY&&e.OPENAI_MODEL),linkedinConnected:linkedin.connected,linkedinPublishing:linkedin.canPublish,database:!!e.DB,account:{email:u.email,name:u.displayName,businessOwner:u.businessOwner,ownerEmail:u.businessOwner?e.NEXORA_OWNER_EMAIL:undefined}});}catch(e){return fail(e);}}
