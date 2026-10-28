import {researchGaps,nextFollowup,defaultSettings,canonicalURL} from './engine.mjs';
export const autonomyDefaults={noPaidProvider:false,inboundOnly:false,enabled:true,keywords:'SEO agencies, content marketing agencies and B2B software businesses needing relevant publisher partnerships',markets:'USA, Canada',services:['Guest Posting','Link Building','Article Writing','SEO','GEO','AEO'],dailyLimit:6,discoveryLimit:3,autoResearch:true,autoDraft:true,autoReply:true,autoProposal:true,autoContent:false,contentBrief:'',minimumMargin:20};
export const jobTypes=['discover','research','profile_research','first_message','reply','followup','proposal','profile_audit','content','send_message','connect_person','edit_profile','publish_post'];
export const externalBlocks={send_message:'LinkedIn personal messaging access is not connected. The documented API requires an explicit member send action; background sending is blocked.',connect_person:'No approved LinkedIn invitations integration is connected.',edit_profile:'No approved LinkedIn profile-edit integration is connected.',publish_post:'LinkedIn publishing credentials are not connected.'};
export function dateKey(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function planWork(rows,config=autonomyDefaults,now=new Date()){
 if(!config.enabled)return [];
 const out=[],day=dateKey(now),leads=rows.filter(x=>x.kind==='lead'),settings=rows.find(x=>x.kind==='settings')?.payload||defaultSettings;
 if(!config.inboundOnly)out.push({type:'discover',targetId:null,dedupe:`discover:${day}`,input:{keywords:config.keywords,markets:config.markets,limit:config.discoveryLimit,services:config.services}});
 for(const r of leads){const p=r.payload;if(['Do not contact','Paused','Delivered'].includes(p.stage))continue;
 const inbound=(p.messages||[]).filter(m=>m.direction==='inbound').at(-1);
 if(config.inboundOnly&&!inbound&&!p.inbound)continue;
 if(config.autoReply&&inbound&&!p.agentHandledMessageIds?.includes(inbound.id))out.push({type:'reply',targetId:r.id,dedupe:`reply:${r.id}:${inbound.id}`,input:{messageId:inbound.id}});
 const needsResearch=researchGaps(p).length>0&&(p.researchStatus==='Not researched'||!p.researchReport?.checkedAt||new Date(p.researchReport.checkedAt).getTime()<now.getTime()-7*864e5);
 if(config.autoResearch&&needsResearch)out.push({type:'research',targetId:r.id,dedupe:`research:${r.id}:${day}`,input:{}});
 if(!config.inboundOnly&&config.autoDraft&&!researchGaps(p).length&&!(p.messages||[]).length&&!p.draftBody)out.push({type:'first_message',targetId:r.id,dedupe:`intro:${r.id}`,input:{}});
 const due=nextFollowup(p,settings);if(config.autoDraft&&due&&new Date(due)<=now)out.push({type:'followup',targetId:r.id,dedupe:`followup:${r.id}:${due}`,input:{dueAt:due,messageId:(p.messages||[]).filter(m=>m.direction==='outbound').at(-1)?.id||null}});
 const q=p.requirements||{};if(config.autoProposal&&q.niche&&q.country&&q.budget&&q.currency&&['Qualified','Proposal','Negotiation'].includes(p.stage))out.push({type:'proposal',targetId:r.id,dedupe:`proposal:${r.id}:${JSON.stringify(q)}`,input:{}});
 }
 const profile=rows.find(x=>x.kind==='profile');if(profile){const p=profile.payload;
 if(config.autoResearch&&/^https:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\//i.test(p.url||'')&&(p.profileResearch?.url&&canonicalURL(p.profileResearch.url)!==canonicalURL(p.url)||!p.sourceCheckedAt||!Number.isFinite(Date.parse(p.sourceCheckedAt))||Date.parse(p.sourceCheckedAt)<now.getTime()-7*864e5))out.push({type:'profile_research',targetId:profile.id,dedupe:`profile-research:${profile.id}:${day}`,input:{url:p.url}});
 if(['headline','about','experience','featured','posts'].some(k=>p[k]?.trim()))out.push({type:'profile_audit',targetId:profile.id,dedupe:`profile:${profile.id}:${JSON.stringify(Object.fromEntries(['headline','about','experience','featured','posts'].map(k=>[k,p[k]||''])))}`,input:{}});}
 if(config.autoContent&&config.contentBrief.trim())out.push({type:'content',targetId:null,dedupe:`content:${day}`,input:{brief:config.contentBrief,services:config.services}});
 return out;
}
export function redactedLead(p){const {payment,privateCost,cost,margin,...rest}=p||{};return rest;}
export function stopReply(text){return /\b(not interested|do not contact|don.t contact|stop messaging|unsubscribe|no thanks)\b/i.test(text);}
