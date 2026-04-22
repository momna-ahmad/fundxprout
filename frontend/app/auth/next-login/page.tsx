'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { completeOAuthSignIn } from '@/lib/action'

export default function NextLogin() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const doLogin = async () => {
      const hash = window.location.hash
      if (!hash) {
        router.replace('/')
        return
      }

      const params = new URLSearchParams(hash.substring(1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')

      if (!access_token || !refresh_token) {
        router.replace('/')
        return
      }

      const { error } = await supabase.auth.setSession({ access_token, refresh_token })

      if (error) {
        console.error('Failed to set Supabase session:', error.message)
        router.replace('/')
        return
      }

      const result = await completeOAuthSignIn()

      if (!result.ok) {
        console.error('Failed to process sign-in on server:', result.error)
        router.replace('/')
        return
      }

      router.replace(result.redirectTo ?? '/')
    }

    void doLogin()
  }, [router])

  return (
    <>
      <p>Logging you in...</p>
    </>
  ) 
}
