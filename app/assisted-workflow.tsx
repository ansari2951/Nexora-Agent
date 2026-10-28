'use client';
import {useEffect,useState} from 'react';
import {CheckCircle2,ArrowRight,Play} from 'lucide-react';
export default function AssistedWorkflow({onOpen,onChanged}:{onOpen:(tab:string)=>void,onChanged:()=>void}){
 const [data,setData]=useState<any>(null),[busy,setBusy]=useState(false),[note,setNote]=useState(''),[error,setError]=useState('');
 async function load(){const r=await fetch('/api/workflow',{cache:'no-store'}),b:any=await r.json();if(!r.ok)throw Error(b.error);setData(b);}
 useEffect(()=>{load().catch(e=>setError(e.message));},[]);
 async function activate(action:string){setBusy(true);setError('');try{const r=await fetch('/api/workflow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})}),b:any=await r.json();if(!r.ok)throw Error(b.error);setNote(b.reason);await load();onChanged();window.dispatchEvent(new Event('nexora-review'));}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 return <section className="card editor-card section-gap" aria-label="No paid provider workflow"><div className="card-heading"><div><h2><CheckCircle2 size={20}/> Use Nexora without a paid provider</h2><p className="muted small">Unipile signup and a separate model API key are not required for the linked ChatGPT workflow.</p></div><span className={'badge '+(data?.noPaidProvider?'green':'neutral')}>{data?.noPaidProvider?'Active · provider access off':'Available'}</span></div>
 {error&&<p className="notice error" role="alert">{error}</p>}{note&&<p className="notice" role="status">{note}</p>}
 <p className="small">Research, personalized drafts, recorded-reply analysis, proposals and post drafts run through your existing ChatGPT workflow. This uses your ChatGPT access and limits; it does not promise free hosting, unlimited AI or a new free subscription.</p>
 {!data?.noPaidProvider&&<button className="btn" disabled={busy||!data} onClick={()=>activate('no_provider')}><Play size={16}/> Activate without paid provider</button>}
 {data?.noPaidProvider&&<p className="small">Internal agent: <b>{data.enabled?'enabled':'paused'}</b> · Follow-ups: <b>{data.followups.followupDays} {data.followups.followupUnit} days</b> · Maximum: {data.followups.maxFollowups}. A recorded reply or do-not-contact status stops the no-reply sequence.</p>}
 <div className="settings-grid section-gap">{[
 ['1. Research prospects','Add a LinkedIn URL and company website, or import your own connections CSV. Queue research and review the sourced results.','Prospects'],
 ['2. Review, send and record','Review the message, open the exact LinkedIn profile, send it yourself, then record the sent message. Paste real replies so the agent can analyze them.','Outreach'],
 ['3. Follow up after 2 days','The timer starts from a recorded send. Review the due draft in the follow-up queue and send it manually.','Action center'],
 ['4. Approve posts and profile changes','Approve the exact post for the separate official posting connection. Apply approved profile suggestions yourself.','Approvals'],
 ['5. Qualify and prepare proposals','Save actual requirements and confirmed publisher rates. Track offers, orders and payments separately.','Sales pipeline']
 ].map(([title,detail,tab])=><div key={title}><h3>{title}</h3><p className="muted small">{detail}</p><button className="text-link" onClick={()=>onOpen(tab)}>Open {tab} <ArrowRight size={14}/></button></div>)}</div>
 <p className="muted small section-gap">Connections and invitations remain manual. The agent can review supplied or publicly accessible profile evidence; missing profile sections stay unknown. Reminders appear inside Nexora. Posting still requires an approved post and a working posting connection.</p>
 {data?.noPaidProvider&&<details><summary>Optional paid-provider setup</summary><p className="muted small">Only choose this if you want to configure a provider with its own trial and monthly billing. This does not purchase a subscription or enable account actions.</p><button className="btn ghost" disabled={busy} onClick={()=>activate('optional_provider')}>Show optional provider setup</button></details>}
 </section>;
}
