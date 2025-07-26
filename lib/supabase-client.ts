import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './supabase-config'

// Client-side auth (for components and client-side code)
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
} 