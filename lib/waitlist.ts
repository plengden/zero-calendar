import { supabase } from "@/lib/supabase-config"

export type WaitlistEntry = {
  email: string
  joinedAt: number
}

export async function getWaitlistCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error("Error getting waitlist count:", error)
      return 0
    }
    
    return count || 0
  } catch (error) {
    console.error("Error getting waitlist count:", error)
    return 0
  }
}

export async function getWaitlistEmails(): Promise<WaitlistEntry[]> {
  try {
    const { data, error } = await supabase
      .from('waitlist')
      .select('*')
      .order('joined_at', { ascending: false })
    
    if (error) {
      console.error("Error getting waitlist emails:", error)
      return []
    }
    
    return data?.map(entry => ({
      email: entry.email,
      joinedAt: new Date(entry.joined_at).getTime()
    })) || []
  } catch (error) {
    console.error("Error getting waitlist emails:", error)
    return []
  }
}

export async function addToWaitlist(email: string): Promise<boolean> {
  try {
    const normalizedEmail = email.toLowerCase().trim()
    
    const { error } = await supabase
      .from('waitlist')
      .insert({ email: normalizedEmail })
    
    if (error) {
      console.error("Error adding to waitlist:", error)
      return false
    }
    
    return true
  } catch (error) {
    console.error("Error adding to waitlist:", error)
    return false
  }
}

export async function exportWaitlistToCSV(): Promise<string> {
  try {
    const entries = await getWaitlistEmails()


    let csv = "Email,JoinedAt\n"


    entries.forEach((entry) => {
      const joinedDate = new Date(entry.joinedAt).toISOString()
      csv += `${entry.email},"${joinedDate}"\n`
    })

    return csv
  } catch (error) {
    console.error("Error exporting waitlist to CSV:", error)
    return "Error,Error\n"
  }
}
