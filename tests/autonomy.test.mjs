import test from 'node:test';import assert from 'node:assert/strict';
import {planWork,autonomyDefaults,redactedLead,stopReply,dateKey} from '../lib/autonomy-policy.mjs';
const now=new Date('2026-10-22T12:00:00Z');
test('Paused agent plans no work',()=>assert.deepEqual(planWork([],{...autonomyDefaults,enabled:false},now),[]));
test('Discovery is a deduplicated daily task with an explicit limit',()=>{const [a]=planWork([],autonomyDefaults,now),[b]=planWork([],autonomyDefaults,now);assert.equal(a.dedupe,b.dedupe);assert.equal(a.input.limit,3)});
test('Discovered candidates are researched immediately despite discovery timestamp',()=>{const r={id:'l',kind:'lead',payload:{name:'Example',stage:'New',profileText:'',researchStatus:'Not researched',researchReport:{checkedAt:now.toISOString()}}};assert.ok(planWork([r],autonomyDefaults,now).some(x=>x.type==='research'))});
test('Suppressed contacts never receive research or conversation jobs',()=>{const r={id:'l',kind:'lead',payload:{stage:'Do not contact',messages:[{id:'m',direction:'inbound',body:'Stop'}]}};assert.deepEqual(planWork([r],autonomyDefaults,now).map(x=>x.type),['discover'])});
test('Profile suggestions do not create an infinite self-review loop',()=>{const a={id:'p',kind:'profile',payload:{headline:'Actual headline'}};const b={...a,payload:{...a.payload,suggestedHeadline:'New suggestion',agentAuditNotes:'Notes'}};assert.equal(planWork([a],autonomyDefaults,now).find(x=>x.type==='profile_audit').dedupe,planWork([b],autonomyDefaults,now).find(x=>x.type==='profile_audit').dedupe)});
test('Private payment and publisher costs are removed before model handoff',()=>{const r=redactedLead({name:'Example',payment:{reference:'private'},cost:60,margin:40});assert.deepEqual(r,{name:'Example'})});
test('Opt-outs and Karachi day boundary are recognized',()=>{assert.equal(stopReply('Please do not contact me again'),true);assert.equal(dateKey(new Date('2026-10-22T20:00:00Z')),'2026-10-23')});
test('Planner uses saved two-calendar-day timing and stops when a reply arrives',()=>{const lead={id:'l',kind:'lead',payload:{stage:'Contacted',messages:[{id:'sent',direction:'outbound',at:'2026-10-20T12:00:00Z'}]}};const settings={kind:'settings',payload:{followupDays:2,followupUnit:'calendar',maxFollowups:2}};assert.equal(planWork([lead,settings],autonomyDefaults,new Date('2026-10-22T11:59:59Z')).some(j=>j.type==='followup'),false);const due=planWork([lead,settings],autonomyDefaults,now).find(j=>j.type==='followup');assert.equal(due.input.dueAt,'2026-10-22T12:00:00.000Z');assert.equal(due.input.messageId,'sent');assert.equal(planWork([{...lead,payload:{...lead.payload,messages:[...lead.payload.messages,{id:'reply',direction:'inbound',body:'Interested'}]}},settings],autonomyDefaults,now).some(j=>j.type==='followup'),false)});
test('Public owner-profile capture needs an exact personal URL, refreshes weekly and never audits empty source',()=>{const r={id:'profile',kind:'profile',payload:{url:'https://www.linkedin.com/in/exact-owner/'}};assert.ok(planWork([r],autonomyDefaults,now).some(j=>j.type==='profile_research'));assert.equal(planWork([r],autonomyDefaults,now).some(j=>j.type==='profile_audit'),false);assert.equal(planWork([{...r,payload:{...r.payload,sourceCheckedAt:now.toISOString()}}],autonomyDefaults,now).some(j=>j.type==='profile_research'),false);assert.equal(planWork([{...r,payload:{url:'https://linkedin.com.evil.test/in/exact-owner'}}],autonomyDefaults,now).some(j=>j.type==='profile_research'),false)});

test('A changed owner profile URL gets researched even inside the weekly refresh interval',()=>{const r={id:'profile',kind:'profile',payload:{url:'https://linkedin.com/in/new-owner',sourceCheckedAt:now.toISOString(),profileResearch:{url:'https://linkedin.com/in/old-owner'}}};assert.ok(planWork([r],autonomyDefaults,now).some(j=>j.type==='profile_research'))});

test('Inbound-only growth skips cold discovery and introductions while keeping actual reply and content work',()=>{
 const now=new Date('2026-10-26T10:00:00Z');
 const rows=[{id:'cold',kind:'lead',payload:{name:'Cold',url:'https://linkedin.com/in/cold',messages:[],researchStatus:'Not researched'}},{id:'incoming',kind:'lead',payload:{name:'Incoming',inbound:true,website:'https://example.test',messages:[{id:'real-inquiry',direction:'inbound',body:'Please discuss our content brief.',at:now.toISOString()}],researchStatus:'Not researched'}}];
 const plans=planWork(rows,{...autonomyDefaults,inboundOnly:true,autoContent:true,contentBrief:'Helpful campaign planning advice.'},now);
 assert.ok(!plans.some(p=>['discover','first_message'].includes(p.type)));
 assert.ok(!plans.some(p=>p.targetId==='cold'));
 assert.ok(plans.some(p=>p.type==='reply'&&p.targetId==='incoming'));
 assert.ok(plans.some(p=>p.type==='content'));
});
