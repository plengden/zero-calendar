import { createServerClient, getCurrentUser } from "@/lib/supabase-server"
import { supabase } from "@/lib/supabase-config"

// User metadata types
export interface UserMetadata {
  name?: string
  timezone?: string
  google_tokens?: {
    access_token?: string
    refresh_token?: string
    expires_at?: number
  }
}

// Supabase Auth functions using user metadata
export async function getUserByEmail(email: string) {
  // For email lookup, we need to use admin functions or search through auth.users
  // This is typically not needed in most apps, but if required, use admin API
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  
  if (error) return null
  
  const user = users.find(u => u.email === email)
  return user || null
}

export async function getUserProfile(userId: string) {
  const { data: { user }, error } = await supabase.auth.admin.getUserById(userId)
  
  if (error || !user) return null
  return user
}

export async function updateUserProfile(userId: string, updates: UserMetadata) {
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: updates
  })
  
  if (error) throw error
  return data.user
}

export async function saveUserPreferences(userId: string, preferences: any) {
  if (!preferences.timezone) {
    try {
      preferences.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    } catch (error) {
      preferences.timezone = "UTC"
    }
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { timezone: preferences.timezone }
  })

  if (error) throw error
}

export async function getUserPreferences(userId: string) {
  const { data: { user }, error } = await supabase.auth.admin.getUserById(userId)
  
  if (error || !user) return { timezone: 'UTC' }
  
  const timezone = user.user_metadata?.timezone || 'UTC'
  return { timezone }
}

export async function getUserTimezone(userId: string): Promise<string> {
  try {
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId)
    
    if (error || !user) return "UTC"
    return user.user_metadata?.timezone || "UTC"
  } catch (error) {
    console.error("Error getting user timezone:", error)
    return "UTC"
  }
}

// Helper function to get current user data with metadata
export async function getCurrentUserData() {
  const user = await getCurrentUser()
  
  if (!user) return null
  
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name,
    timezone: user.user_metadata?.timezone || 'UTC',
    googleTokens: user.user_metadata?.google_tokens
  }
}

export async function auth() {
  return await getCurrentUser()
}
