import { getWorkspaceUser } from '@/lib/identity';
export const noStore={'Cache-Control':'private, no-store'};
export function reply(data:unknown,status=200){return Response.json(data,{status,headers:noStore});}
export async function authorize(req:Request,write=false){const u=await getWorkspaceUser();if(!u)throw new Error('AUTH');if(write){const origin=req.headers.get('origin');if(!origin||origin!==new URL(req.url).origin)throw new Error('ORIGIN');}return u;}
export function fail(e:unknown){const m=e instanceof Error?e.message:'Unknown error';if(m==='AUTH')return reply({error:'Sign in to Nexora to load and save your workspace.'},401);if(m==='ORIGIN')return reply({error:'Cross-origin request rejected.'},403);console.error('Nexora request failed:',m.slice(0,250));return reply({error:m.startsWith('VALIDATION:')?m.slice(11):'The operation could not finish. Your previous saved data has been kept.'},m.startsWith('VALIDATION:')?400:500);}
