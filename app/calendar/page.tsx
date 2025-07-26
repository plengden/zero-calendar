import { redirect } from "next/navigation"
import { getCurrentUserData } from "@/lib/auth"
import { MultiCalendarView } from "@/components/multi-calendar-view"
import { getEvents, getUserCategories } from "@/lib/calendar-supabase"
import { CalendarHeader } from "@/components/calendar-header"
import { Sidebar } from "@/components/sidebar"

export default async function CalendarPage() {
  const userData = await getCurrentUserData()

  if (!userData) {
    redirect("/auth/signin")
  }

  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  const events = await getEvents(userData.id, startOfMonth, endOfMonth)
  const categories = await getUserCategories(userData.id)

  return (
    <div className="flex h-screen flex-col">
      <CalendarHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4">
          <MultiCalendarView initialEvents={events} initialCategories={categories} />
        </main>
      </div>
    </div>
  )
}
