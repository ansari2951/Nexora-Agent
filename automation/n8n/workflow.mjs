// Credential-free workflow factory. Credentials are assigned in the owner's n8n editor.
export function buildWorkflow(origin){
 const nodes=[],connections={};
 const add=(name,type,typeVersion,parameters,x,y,extra={})=>{nodes.push({id:name.toLowerCase().replaceAll(' ','-'),name,type,typeVersion,position:[x,y],parameters,...extra});};
 const link=(a,b,index=0)=>{connections[a]??={main:[]};connections[a].main[index]??=[];connections[a].main[index].push({node:b,type:'main',index:0});};
 add('Setup notes','n8n-nodes-base.stickyNote',1,{content:'# Nexora internal runner\n1. Create Nexora runner credential (Agent control → n8n).\n2. Set Header Auth on all Nexora HTTP nodes: Authorization = Bearer <runner token>.\n3. Set Gemini Header Auth: x-goog-api-key = your API key. Never put keys in this workflow JSON.\n4. Check the Gemini model available in your account.\n5. Enable model processing + runner in Nexora. Execute manually, inspect saved results, then publish this workflow.\n\nNo messages, invitations, profile edits, orders, payments or posts are executed here. At most two internal tasks/run. No automatic HTTP retries. Google Search grounding/quota can incur provider charges. Keep execution data private.',height:520,width:420},-500,-100);
 add('Manual test','n8n-nodes-base.manualTrigger',1,{},0,0);
 add('Every 30 minutes','n8n-nodes-base.scheduleTrigger',1.2,{rule:{interval:[{field:'minutes',minutesInterval:30}]}},0,180);
 const http=(name,body,x,y)=>add(name,'n8n-nodes-base.httpRequest',4.2,{method:'POST',url:origin+'/api/n8n/worker',authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',sendBody:true,specifyBody:'json',jsonBody:body,options:{timeout:120000}},x,y,{retryOnFail:false});
 for(let i=1;i<=2;i++){
 const x=260+(i-1)*1280;
 http('Claim '+i,JSON.stringify({action:'tick'}),x,0);
 add('Has task '+i,'n8n-nodes-base.if',2.2,{conditions:{options:{caseSensitive:true,typeValidation:'strict',version:2},conditions:[{id:'has-job',leftValue:'={{ Boolean($json.job && $json.job.id) }}',rightValue:true,operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}},x+220,0);
 add('Gemini '+i,'n8n-nodes-base.httpRequest',4.2,{method:'POST',url:'https://generativelanguage.googleapis.com/v1beta/interactions',authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',sendBody:true,specifyBody:'json',jsonBody:'={{ JSON.stringify({ model: "gemini-3.8-flash", store: false, system_instruction: $json.instructions, input: JSON.stringify({job: $json.job.type, input: $json.job.input, record: $json.record, settings: $json.settings, outputSchema: $json.outputSchema}), ...(["research","profile_research","content","discover"].includes($json.job.type) ? {tools:[{type:"google_search"}]} : {}) }) }}',options:{timeout:120000}},x+440,-100,{retryOnFail:false,onError:'continueRegularOutput'});
 add('Parse result '+i,'n8n-nodes-base.code',2,{jsCode:`const work = $('Claim ${i}').first().json;
const raw = $input.first().json;
const base = {action:'complete', job_id:work.job.id, lease:work.job.lease, result:{}};
try {
 if (raw.error) throw new Error('AI provider request failed; check credentials, model and quota in n8n.');
 const text = raw.output_text || (raw.steps || []).filter(s=>s.type==='model_output').flatMap(s=>s.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('\\n') || (raw.outputs || []).filter(c=>c.type==='text').map(c=>c.text).join('\\n');
 if (!text) throw new Error('AI returned no final text. Review provider response; no retry performed.');
 const fence = String.fromCharCode(96).repeat(3);
 base.result = JSON.parse(text.trim().replace(new RegExp('^'+fence+'(?:json)?\\\\s*','i'),'').replace(new RegExp('\\\\s*'+fence+'$'),''));
 if (!base.result || typeof base.result!=='object' || Array.isArray(base.result)) throw new Error('AI did not return a JSON object.');
 if (['research','profile_research','discover'].includes(work.job.type) && (base.result.identityMatched || work.job.type==='discover')) {
  const citations=(raw.steps||[]).filter(s=>s.type==='model_output').flatMap(s=>s.content||[]).flatMap(c=>c.annotations||[]).filter(a=>a.type==='url_citation').map(a=>a.url);
  const sources=base.result.sources || (base.result.prospects||[]).flatMap(p=>p.sources||[]);
  if (!citations.length || !sources.length || sources.some(s=>!citations.includes(s.url))) throw new Error('Research sources were not backed by provider citation metadata. Exact profile evidence remains unknown.');
 }
} catch(e) { base.result={}; base.blocked_reason='n8n: '+e.message; }
return [{json:base}];`},x+660,-100);
 http('Save result '+i,'={{ JSON.stringify($json) }}',x+880,-100);
 link('Claim '+i,'Has task '+i);link('Has task '+i,'Gemini '+i,0);link('Gemini '+i,'Parse result '+i);link('Parse result '+i,'Save result '+i);
 if(i===1){link('Save result 1','Claim 2');link('Has task 1','Claim 2',1);}else{link('Save result 2','Verify runner');link('Has task 2','Verify runner',1);}
 }
 http('Verify runner',JSON.stringify({action:'status'}),2800,0);
 link('Manual test','Claim 1');link('Every 30 minutes','Claim 1');
 return {name:'Nexora — internal research, requirements and proposals',nodes,connections,active:false,settings:{executionOrder:'v1',timezone:'Asia/Karachi',saveDataSuccessExecution:'none',saveDataErrorExecution:'none',saveManualExecutions:false,executionTimeout:600},pinData:{},tags:[]};
}

export function buildAccountWorkflow(origin){
 const http=(name,action,x)=>({id:name.toLowerCase().replaceAll(' ','-'),name,type:'n8n-nodes-base.httpRequest',typeVersion:4.2,position:[x,0],retryOnFail:false,parameters:{method:'POST',url:origin+'/api/n8n/account',authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',sendBody:true,specifyBody:'json',jsonBody:JSON.stringify({action}),options:{timeout:180000}}});
 const edge=name=>({main:[[{node:name,type:'main',index:0}]]});
 return {name:'Nexora — approved LinkedIn account actions',active:false,nodes:[{id:'manual',name:'Manual account test',type:'n8n-nodes-base.manualTrigger',typeVersion:1,position:[0,0],parameters:{}},{id:'timer',name:'Every 30 minutes',type:'n8n-nodes-base.scheduleTrigger',typeVersion:1.2,position:[0,180],parameters:{rule:{interval:[{field:'minutes',minutesInterval:30}]}}},{id:'notes',name:'Read before activation',type:'n8n-nodes-base.stickyNote',typeVersion:1,position:[-500,-50],parameters:{width:420,height:420,content:'# Separate execution scopes\nAssign the Nexora runner Header Auth credential to both HTTP nodes. Enable only the runner scopes you want in Nexora.\n\nPosting: only due posts with an existing exact owner approval.\nNetwork: actual connected/enabled provider + saved per-feature rules + no-paid-provider mode off. Headline/About need exact approval snapshots.\n\nAt most one connection page, one network action and one due post/cycle. No model generates actions here. The server rechecks account identity and actual permission. No automatic retries. Unknown outcomes remain uncertain; check receipts before any further action.\n\nImport inactive. Test manually before publishing.'}},http('Run authorized cycle','cycle',280),http('Verify account receipts','status',580)],connections:{'Manual account test':edge('Run authorized cycle'),'Every 30 minutes':edge('Run authorized cycle'),'Run authorized cycle':edge('Verify account receipts')},settings:{executionOrder:'v1',timezone:'Asia/Karachi',saveDataSuccessExecution:'none',saveDataErrorExecution:'none',saveManualExecutions:false,executionTimeout:600},pinData:{},tags:[]};
}
