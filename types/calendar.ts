export type CalendarEvent = {
  id: string
  title: string
  description?: string
  start: string
  end: string
  location?: string
  color?: string
  userId: string
  source?: "google" | "local" | "microsoft"
  sourceId?: string
  recurrence?: RecurrenceRule
  exceptions?: {
    date: string
    status: "cancelled" | "modified"
    modifiedEvent?: Omit<CalendarEvent, "id" | "userId" | "recurrence" | "exceptions">
  }[]
  attendees?: { email: string; name?: string; status?: "accepted" | "declined" | "tentative" | "needs-action" }[]
  categories?: string[]
  reminders?: { minutes: number; method: "email" | "popup" }[]
  timezone?: string
  allDay?: boolean
  isRecurring?: boolean
  isShared?: boolean
  sharedBy?: string
  sharedWith?: string[]
  isRecurringInstance?: boolean
  originalEventId?: string
  exceptionDate?: string
}

export type RecurrenceRule = {
  frequency: "daily" | "weekly" | "monthly" | "yearly"
  interval: number
  count?: number
  until?: string
  byDay?: string[]
  byMonthDay?: number[]
  byMonth?: number[]
  bySetPos?: number[]
  weekStart?: string
  exceptions?: string[]
}
