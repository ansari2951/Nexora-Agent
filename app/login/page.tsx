import Login from '../login-screen';
import {getChatGPTUser} from '../chatgpt-auth';
export const dynamic='force-dynamic';
export default async function LoginPage(){return <Login signedIn={!!(await getChatGPTUser())}/>;}
