import { createClient } from "@/lib/supabase-client"

// Client-side auth functions (for components)
export async function saveUserPreferencesClient(userId: string, preferences: any) {
  const supabase = createClient()
  
  if (!preferences.timezone) {
    try {
      preferences.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    } catch (error) {
      preferences.timezone = "UTC"
    }
  }

  const { error } = await supabase.auth.updateUser({
    data: { timezone: preferences.timezone }
  })

  if (error) throw error
}

export async function getUserPreferencesClient() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) return { timezone: 'UTC' }
  
  const timezone = user.user_metadata?.timezone || 'UTC'
  return { timezone }
}

export async function getUserTimezoneClient(): Promise<string> {
  try {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) return "UTC"
    return user.user_metadata?.timezone || "UTC"
  } catch (error) {
    console.error("Error getting user timezone:", error)
    return "UTC"
  }
} 