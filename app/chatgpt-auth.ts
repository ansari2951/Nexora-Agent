import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
// Legacy export names retained for existing workspace imports. Identity is Clerk-only.
export type ChatGPTUser={userId:string;displayName:string;email:string;fullName:string|null};
export async function getChatGPTUser():Promise<ChatGPTUser|null>{
 const session=await auth();if(!session.userId)return null;
 const user=await currentUser();if(!user)return null;
 const primary=user.emailAddresses.find(e=>e.id===user.primaryEmailAddressId&&e.verification?.status==='verified');
 const email=primary?.emailAddress||'';
 return {userId:user.id,email,displayName:user.fullName||user.username||email||'Nexora user',fullName:user.fullName};
}
export async function requireChatGPTUser(returnTo:string){const user=await getChatGPTUser();if(user)return user;redirect(chatGPTSignInPath(returnTo));}
export function chatGPTSignInPath(returnTo:string){const path=returnTo.startsWith('/')&&!returnTo.startsWith('//')?returnTo:'/';return '/sign-in?redirect_url='+encodeURIComponent(path);}
export function chatGPTSignOutPath(){return '/sign-out';}
