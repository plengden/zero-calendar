import { redirect } from "next/navigation"
import { getCurrentUserData } from "@/lib/auth"
import { CalendarHeader } from "@/components/calendar-header"
import { SettingsForm } from "@/components/settings-form"
import { getUserPreferences } from "@/lib/auth"

export default async function SettingsPage() {
  const userData = await getCurrentUserData()

  if (!userData) {
    redirect("/auth/signin")
  }

  const preferences = await getUserPreferences(userData.id)

  return (
    <div className="flex h-screen flex-col">
      <CalendarHeader />
      <main className="container max-w-3xl py-8">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <SettingsForm initialPreferences={preferences} />
      </main>
    </div>
  )
}
