'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signup  } from '@/lib/action';
import { redirect } from 'next/navigation';
import GoogleSignIn from "@/components/google-signIn";

// Helper to display errors
const initialState = {
  error: '',
}

export default function Page() {

  const [state, formAction] = useActionState(
    signup,
    initialState,
  );


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Sign In</h2>
        
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              name='email'
              type="email"
              id="email"
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              name='password'
              type="password"
              id="password"
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          
          
          <button
            type="submit"
            className="btn btn-outline w-full"
            
          >
            Sign Up
          </button>

          {initialState.error && (
            <p className="text-red-500 text-sm mt-2 text-center">
              {initialState.error}
            </p>
          )}


          <p className="text-sm text-gray-600 text-center mt-4">
            or
          </p>

          <Link href={"/sign-up"} >
          <button className=" text-center w-full block border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:border-transparent hover:bg-blue-600 hover:text-white active:bg-blue-700 transition ">
                    Sign In
            </button>
          </Link>

        </form>
        <GoogleSignIn />
      </div>
    </div>
  );
}
