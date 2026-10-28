import {authorize,fail} from '@/lib/server';
import {buildWorkflow,buildAccountWorkflow} from '@/automation/n8n/workflow.mjs';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{await authorize(req);const url=new URL(req.url),account=url.searchParams.get('kind')==='account';return Response.json((account?buildAccountWorkflow:buildWorkflow)(url.origin),{headers:{'Content-Disposition':account?'attachment; filename="nexora-n8n-accounts.json"':'attachment; filename="nexora-n8n-workflow.json"','Cache-Control':'private, no-store'}});}catch(e){return fail(e);}}
