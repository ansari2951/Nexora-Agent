import Workspace from './workspace';
import Login from './login-screen';
import {getWorkspaceUser} from '@/lib/identity';
export const dynamic='force-dynamic';
export default async function Page(){
 const user=await getWorkspaceUser();
 if(!user)return <Login/>;
 return <Workspace identity={{email:user.email,name:user.displayName,businessOwner:user.businessOwner}}/>;
}
