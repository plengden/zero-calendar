import { supabase } from "@/lib/supabase-config"

export type CalendarEvent = {
  id: string
  title: string
  description?: string
  start: string
  end: string
  allDay: boolean
  location?: string
  color?: string
  categoryId?: string
  category?: string
  userId: string
  source?: "google" | "local" | "microsoft"
  sourceId?: string
  timezone?: string
  shared?: boolean
  isShared?: boolean
}

export type CalendarCategory = {
  id: string
  name: string
  color: string
  userId: string
  visible: boolean
}

// Get user timezone from auth metadata
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

// Get events for a user within a date range
export async function getEvents(userId: string, start: Date, end: Date): Promise<CalendarEvent[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', start.toISOString())
      .lte('end_time', end.toISOString())
      .order('start_time')

    if (error) {
      console.error("Error fetching events:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error fetching events:", error)
    return []
  }
}

// Create a new event
export async function createEvent(event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> {
  try {
    const { data, error } = await supabase
      .from('events')
      .insert({
        user_id: event.userId,
        title: event.title,
        description: event.description,
        start_time: event.start,
        end_time: event.end,
        all_day: event.allDay,
        location: event.location,
        color: event.color || '#3b82f6',
        source: event.source || 'local',
        source_id: event.sourceId,
        timezone: event.timezone
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error creating event:", error)
    throw new Error("Failed to create event")
  }
}

// Update an existing event
export async function updateEvent(event: CalendarEvent): Promise<CalendarEvent> {
  try {
    const { data, error } = await supabase
      .from('events')
      .update({
        title: event.title,
        description: event.description,
        start_time: event.start,
        end_time: event.end,
        all_day: event.allDay,
        location: event.location,
        color: event.color,
        source: event.source,
        source_id: event.sourceId,
        timezone: event.timezone
      })
      .eq('id', event.id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error updating event:", error)
    throw new Error("Failed to update event")
  }
}

// Delete an event
export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId)

    if (error) throw error
  } catch (error) {
    console.error("Error deleting event:", error)
    throw new Error("Failed to delete event")
  }
}

// Search events
export async function searchEvents(userId: string, query: string): Promise<CalendarEvent[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('start_time')

    if (error) {
      console.error("Error searching events:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error searching events:", error)
    return []
  }
}

// Get user categories (simplified - using default categories)
export async function getUserCategories(userId: string): Promise<CalendarCategory[]> {
  // Return default categories for now
  return [
    { id: "personal", name: "Personal", color: "#3b82f6", userId, visible: true },
    { id: "work", name: "Work", color: "#10b981", userId, visible: true },
    { id: "family", name: "Family", color: "#8b5cf6", userId, visible: true },
  ]
}

// Get shared events (simplified - empty for now)
export async function getSharedEvents(userId: string, start?: Date, end?: Date): Promise<CalendarEvent[]> {
  return []
}

// Get today's events
export async function getTodayEvents(userId: string): Promise<CalendarEvent[]> {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

  return getEvents(userId, startOfDay, endOfDay)
}

// Get a specific event
export async function getEvent(userId: string, eventId: string): Promise<CalendarEvent | null> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error("Error fetching event:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error fetching event:", error)
    return null
  }
}

// Create a new calendar (simplified - just returns a category)
export async function createCalendar(calendar: {
  userId: string
  name: string
  color: string
}): Promise<CalendarCategory> {
  // For now, just return a mock category since we're not storing categories in DB yet
  return {
    id: `calendar-${Date.now()}`,
    name: calendar.name,
    color: calendar.color,
    userId: calendar.userId,
    visible: true
  }
}

// Check if Google Calendar is connected (simplified)
export async function hasGoogleCalendarConnected(userId: string): Promise<boolean> {
  try {
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId)
    
    if (error || !user) return false
    
    // Check if user has Google tokens in metadata
    return !!(user.user_metadata?.google_tokens?.access_token)
  } catch (error) {
    console.error("Error checking Google Calendar connection:", error)
    return false
  }
} 