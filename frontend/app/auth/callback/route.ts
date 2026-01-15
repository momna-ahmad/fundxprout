import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Login successful -> Redirect to original page or Dashboard
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.log(error.message) ;
  }
  // Login failed -> Redirect to error page
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}