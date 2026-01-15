'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// 1. Google Login Action
export async function signInWithGoogle() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Redirect to the callback route we created in Step 4
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`, 
    },
  })

  if (data.url) {
    redirect(data.url) // Send user to Google
  }
}

// 2. Email Login Action
export async function login(prevState: string | undefined, formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  console.log(error) ;

  if (error) {
    return 'Invalid credentials' ; // Return error to frontend
  }

  redirect('/dashboard')
}

export async function signup(prevState: { error : string | undefined },formData: FormData) {
  const supabase = await createClient()
  
  // 1. Get form data
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string // Optional: if you want their name

  // 2. Determine the "Redirect URL" for email confirmation
  // We need to tell Supabase where to send the user after they click the link in their email.
  const origin = (await headers()).get('origin')

  // 3. Call Supabase Sign Up
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // This ensures they come back to YOUR site, not Supabase's default
      emailRedirectTo: `${origin}/auth/callback`, 
      data: {
        full_name: fullName, // This saves to 'raw_user_meta_data'
      },
    },
  })

  if (error) {
    console.error(error.code + ' ' + error.message)
    return { error: error.message }
  }

  // 4. Redirect to a "Check your email" page
  redirect('/dashboard')
}

export async function logOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}