import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { CalendarHeader } from "@/components/calendar-header"
import { Sidebar } from "@/components/sidebar"

export default async function PeoplePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <div className="flex h-screen flex-col">
      <CalendarHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">People</h1>
            <div className="bg-card p-8 rounded-xl border shadow-soft">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <h2 className="text-2xl font-semibold mb-2">Coming Soon</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  We're working on features to help you collaborate with others and share calendars. Check back soon!
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
