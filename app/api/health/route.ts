import {env} from '@/lib/runtime';
export const dynamic='force-dynamic';
export async function GET(){try{await env.DB.prepare('SELECT 1 AS ok').first();return Response.json({status:'ok',database:'connected'},{headers:{'Cache-Control':'no-store'}});}catch{console.error('Database health check failed');return Response.json({status:'unavailable',database:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}}
