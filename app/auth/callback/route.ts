import { createServerClient } from '@/lib/supabase-auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const callbackUrl = searchParams.get('callbackUrl') || '/calendar'

  if (code) {
    const supabase = await createServerClient()
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // User data is automatically stored in user_metadata from OAuth
      // No need to create separate profile
      console.log('User signed in:', data.user.email)
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}${callbackUrl}`)
} 