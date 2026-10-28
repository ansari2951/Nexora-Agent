import {authorize,reply,fail} from '@/lib/server';
import {controls,setControls,ownerRows,prepare} from '@/lib/autonomy';
import {networkStatus,configureNetwork} from '@/lib/network';
import {defaultSettings,followupSettings} from '@/lib/engine.mjs';
import {getDb} from '@/db';
import {records} from '@/db/schema';
import {and,eq} from 'drizzle-orm';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const u=await authorize(req),config=await controls(u.userId),saved=(await ownerRows(u.userId)).find(r=>r.kind==='settings');return reply({noPaidProvider:!!config.noPaidProvider,enabled:config.enabled,followups:followupSettings(saved?.payload||defaultSettings)});}catch(e){return fail(e);}}
export async function POST(req:Request){try{
 const u=await authorize(req,true),body:any=await req.json();
 if(!['no_provider','optional_provider'].includes(body.action))throw Error('VALIDATION: Choose a supported workflow.');
 const current=await controls(u.userId);
 if(body.action==='optional_provider'){await setControls(u.userId,{...current,noPaidProvider:false});return reply({noPaidProvider:false,reason:'Optional provider setup is available. No connection, execution or paid subscription was activated.'});}
 // Persist the provider gate before touching other settings. All provider HTTP calls enforce it.
 await setControls(u.userId,{...current,noPaidProvider:true,enabled:true,autoResearch:true,autoDraft:true,autoReply:true,autoProposal:true,autoContent:true});
 const network=await networkStatus(u.userId);
 if(network.configured)await configureNetwork(u.userId,{...network.config,enabled:false,autoMessages:false,autoInvites:false,autoAccept:false});
 const old=(await ownerRows(u.userId)).find(r=>r.kind==='settings'),stamp=new Date().toISOString(),payload={...defaultSettings,...old?.payload,followupDays:2,followupUnit:'calendar',useHostedAgent:true};
 const changed=await getDb().insert(records).values({id:old?.id||crypto.randomUUID(),owner:u.userId,kind:'settings',payload:JSON.stringify(payload),createdAt:stamp,updatedAt:stamp}).onConflictDoUpdate({target:records.id,set:{payload:JSON.stringify(payload),updatedAt:stamp},setWhere:and(eq(records.owner,u.userId),eq(records.kind,'settings'),...(old?[eq(records.updatedAt,old.updatedAt)]:[]))}).returning();
 if(!changed.length)throw Error('VALIDATION: Preferences changed during setup. Refresh and activate again. Paid-provider execution remains disabled.');
 const planned=await prepare(u.userId);
 return reply({noPaidProvider:true,created:planned.created,reason:'No-provider workflow active. Research and drafts enabled; follow-ups use 2 calendar days after recorded sends. Messages, invitations and profile changes are manual. Approved official posting is unchanged.'});
}catch(e){return fail(e);}}
