'use client';
import {useClerk} from '@clerk/nextjs';
import {useEffect} from 'react';
export default function Page(){const {signOut}=useClerk();useEffect(()=>{void signOut({redirectUrl:'/login'});},[signOut]);return <main style={{padding:40}}>Signing out…</main>;}
