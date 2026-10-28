import Login from '../login-screen';
import {getChatGPTUser} from '../chatgpt-auth';
export const dynamic='force-dynamic';
export default async function SignupPage(){const u=await getChatGPTUser();return <Login mode="signup" signedIn={!!u} name={u?.fullName||u?.email.split('@')[0]||''}/>;}
