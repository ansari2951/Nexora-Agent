import {env} from '@/lib/runtime';
import {getChatGPTUser, type ChatGPTUser} from '@/app/chatgpt-auth';

export type WorkspaceUser = ChatGPTUser & {actorId:string; businessOwner:boolean};

// Only the platform-authenticated email may claim the configured business
// workspace. Never read an owner, email, or workspace ID from request bodies.
export async function getWorkspaceUser():Promise<WorkspaceUser|null>{
  const user=await getChatGPTUser();
  if(!user)return null;
  const config=env as Record<string,unknown>;
  const ownerEmail=String(config.NEXORA_OWNER_EMAIL||'').trim().toLowerCase();
  const workspaceId=String(config.NEXORA_OWNER_WORKSPACE_ID||'').trim();
  const businessOwner=!!(ownerEmail&&workspaceId&&(user.email.trim().toLowerCase()===ownerEmail||user.userId===workspaceId));
  return {...user,actorId:user.userId,userId:businessOwner?workspaceId:user.userId,businessOwner};
}
