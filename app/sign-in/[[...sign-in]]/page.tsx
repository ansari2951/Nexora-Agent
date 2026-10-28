import {SignIn} from '@clerk/nextjs';
export const dynamic='force-dynamic';
export default function Page(){return <main className="login-shell" style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24}}><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/"/></main>;}
