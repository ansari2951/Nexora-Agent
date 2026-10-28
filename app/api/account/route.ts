import {authorize,reply,fail} from '@/lib/server';
import {getDb} from '@/db';
import {records} from '@/db/schema';
import {defaultSettings} from '@/lib/engine.mjs';
import {and,eq} from 'drizzle-orm';
import {z} from 'zod';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{const u=await authorize(req,true),b=z.object({name:z.string().trim().min(1).max(100),phone:z.string().regex(/^$|^\+[1-9]\d{6,14}$/).optional()}).parse(await req.json()),db=getDb(),stamp=new Date().toISOString();
 const previous=await db.select().from(records).where(and(eq(records.owner,u.userId),eq(records.kind,'settings')));
 const writes:any[]=[db.insert(records).values({id:'registered:'+u.userId,owner:u.userId,kind:'activity',payload:JSON.stringify({label:'Private workspace registered',at:stamp}),createdAt:stamp,updatedAt:stamp}).onConflictDoNothing()];
 if(!previous.length)writes.push(db.insert(records).values({id:'settings:'+u.userId,owner:u.userId,kind:'settings',payload:JSON.stringify({...defaultSettings,name:b.name,phone:b.phone||''}),createdAt:stamp,updatedAt:stamp}).onConflictDoNothing());if(previous.length&&b.phone)writes.push(db.update(records).set({payload:JSON.stringify({...JSON.parse(previous[0].payload),phone:b.phone}),updatedAt:stamp}).where(and(eq(records.owner,u.userId),eq(records.id,previous[0].id))));await db.batch(writes as any);return reply({registered:true});
 }catch(e){if(e instanceof z.ZodError)return reply({error:'Enter your name (1–100 characters) and an optional phone with country code, for example +923001234567.'},400);return fail(e);}}
