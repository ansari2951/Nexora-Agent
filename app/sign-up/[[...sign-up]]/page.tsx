import {SignUp} from '@clerk/nextjs';
export const dynamic='force-dynamic';
export default function Page(){return <main className="login-shell" style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24}}><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/"/></main>;}
