import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (you'll need to generate these from your Supabase dashboard)
export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          location: string | null
          start_time: string
          end_time: string
          all_day: boolean
          color: string
          source: string
          google_event_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          location?: string | null
          start_time: string
          end_time: string
          all_day?: boolean
          color?: string
          source?: string
          google_event_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          location?: string | null
          start_time?: string
          end_time?: string
          all_day?: boolean
          color?: string
          source?: string
          google_event_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      waitlist: {
        Row: {
          id: string
          email: string
          joined_at: string
        }
        Insert: {
          id?: string
          email: string
          joined_at?: string
        }
        Update: {
          id?: string
          email?: string
          joined_at?: string
        }
      }
    }
  }
} 