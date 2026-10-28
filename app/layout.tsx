import {ClerkProvider} from '@clerk/nextjs';
import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Nexora — LinkedIn Growth & Sales',description:'Research first. Build better connections. A private sales workspace for Faizan.',robots:{index:false,follow:false},icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/">{children}</ClerkProvider></body></html>;}

export const dynamic='force-dynamic';
