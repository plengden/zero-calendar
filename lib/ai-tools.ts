import { getEvents, getTodayEvents, createEvent, updateEvent, deleteEvent } from "./calendar"
import { findAvailableTimeSlots, checkForConflicts, analyzeBusyTimes } from "./calendar-utils"
import { areIntervalsOverlapping, format, addDays, startOfDay, endOfDay, isSameDay } from "date-fns"


export const calendarTools = {
  getEvents,
  getTodayEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  findEvents: async (userId: string, query: string) => {
    try {

      const now = new Date()
      const thirtyDaysLater = new Date(now)
      thirtyDaysLater.setDate(now.getDate() + 30)

      const events = await getEvents(userId, now.toISOString(), thirtyDaysLater.toISOString())


      const lowerQuery = query.toLowerCase()
      return events.filter(
        (event) =>
          event.title?.toLowerCase().includes(lowerQuery) ||
          event.description?.toLowerCase().includes(lowerQuery) ||
          event.location?.toLowerCase().includes(lowerQuery),
      )
    } catch (error) {
      console.error("Error finding events:", error)
      return []
    }
  },
  findAvailableTimeSlots,
  checkForConflicts,
  analyzeBusyTimes,
  findOptimalMeetingTime: async (
    userId: string,
    participantIds: string[],
    durationMinutes: number,
    startDate: string,
    endDate: string,
  ) => {
    try {


      return await findAvailableTimeSlots(userId, startDate, durationMinutes)
    } catch (error) {
      console.error("Error finding optimal meeting time:", error)
      return []
    }
  },
  rescheduleEvent: async (userId: string, eventId: string, newStartTime: string, newEndTime: string) => {
    try {
      return await updateEvent(userId, eventId, {
        start: newStartTime,
        end: newEndTime,
      })
    } catch (error) {
      console.error("Error rescheduling event:", error)
      throw error
    }
  },
  getCalendarAnalytics: async (userId: string, startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    const events = await getEvents(userId, start, end)

    let totalMeetingMinutes = 0
    let meetingCount = 0
    const categoryCounts: Record<string, number> = {}
    const dailyMeetingMinutes: Record<string, number> = {}

    events.forEach((event) => {
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)

      if (event.allDay) return

      const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60)
      totalMeetingMinutes += durationMinutes
      meetingCount++

      if (event.categories && event.categories.length > 0) {
        event.categories.forEach((category) => {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1
        })
      } else {
        categoryCounts["Uncategorized"] = (categoryCounts["Uncategorized"] || 0) + 1
      }

      const dateKey = format(eventStart, "yyyy-MM-dd")
      dailyMeetingMinutes[dateKey] = (dailyMeetingMinutes[dateKey] || 0) + durationMinutes
    })

    const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const averageDailyMeetingMinutes = totalMeetingMinutes / dayCount

    let busiestDay = ""
    let busiestDayMinutes = 0

    Object.entries(dailyMeetingMinutes).forEach(([date, minutes]) => {
      if (minutes > busiestDayMinutes) {
        busiestDay = date
        busiestDayMinutes = minutes
      }
    })

    return {
      totalMeetingMinutes,
      totalMeetingHours: Math.round((totalMeetingMinutes / 60) * 10) / 10,
      meetingCount,
      averageMeetingLength: meetingCount > 0 ? Math.round(totalMeetingMinutes / meetingCount) : 0,
      averageDailyMeetingMinutes: Math.round(averageDailyMeetingMinutes),
      averageDailyMeetingHours: Math.round((averageDailyMeetingMinutes / 60) * 10) / 10,
      categoryCounts,
      busiestDay,
      busiestDayMinutes,
      busiestDayHours: Math.round((busiestDayMinutes / 60) * 10) / 10,
      dailyMeetingMinutes,
    }
  },

  findFreeTimeSlots: async (userId: string, startDate: string, endDate: string, minDurationMinutes = 30) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    const events = await getEvents(userId, start, end)

    const sortedEvents = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

    const freeSlots = []
    let currentDay = startOfDay(start)
    const lastDay = endOfDay(end)

    while (currentDay <= lastDay) {
      const dayStart = new Date(currentDay)
      dayStart.setHours(9, 0, 0, 0)

      const dayEnd = new Date(currentDay)
      dayEnd.setHours(17, 0, 0, 0)

      if (dayEnd < start || dayStart > end) {
        currentDay = addDays(currentDay, 1)
        continue
      }

      const effectiveDayStart = dayStart < start ? start : dayStart
      const effectiveDayEnd = dayEnd > end ? end : dayEnd

      const dayEvents = sortedEvents.filter((event) => {
        const eventStart = new Date(event.start)
        const eventEnd = new Date(event.end)
        return areIntervalsOverlapping(
          { start: effectiveDayStart, end: effectiveDayEnd },
          { start: eventStart, end: eventEnd },
        )
      })

      const timePointer = effectiveDayStart

      const augmentedEvents = [
        { start: effectiveDayStart.toISOString(), end: effectiveDayStart.toISOString() },
        ...dayEvents,
        { start: effectiveDayEnd.toISOString(), end: effectiveDayEnd.toISOString() },
      ]

      for (let i = 0; i < augmentedEvents.length - 1; i++) {
        const currentEventEnd = new Date(augmentedEvents[i].end)
        const nextEventStart = new Date(augmentedEvents[i + 1].start)

        if (nextEventStart.getTime() - currentEventEnd.getTime() >= minDurationMinutes * 60 * 1000) {
          freeSlots.push({
            start: currentEventEnd.toISOString(),
            end: nextEventStart.toISOString(),
            duration: Math.floor((nextEventStart.getTime() - currentEventEnd.getTime()) / (1000 * 60)),
            label: `${format(currentEventEnd, "EEE, MMM d, h:mm a")} - ${format(nextEventStart, "h:mm a")}`,
          })
        }
      }

      currentDay = addDays(currentDay, 1)
    }

    return {
      freeSlots,
      totalFreeSlots: freeSlots.length,
      totalFreeDurationMinutes: freeSlots.reduce((total, slot) => total + slot.duration, 0),
    }
  },

  suggestRescheduling: async (userId: string, eventId: string) => {
    const now = new Date()
    const futureDate = addDays(now, 14)
    const events = await getEvents(userId, now, futureDate)

    const eventToReschedule = events.find((event) => event.id === eventId)
    if (!eventToReschedule) {
      return {
        success: false,
        message: "Event not found",
      }
    }

    const eventStart = new Date(eventToReschedule.start)
    const eventEnd = new Date(eventToReschedule.end)
    const durationMinutes = Math.floor((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60))

    const result = await calendarTools.findFreeTimeSlots(
      userId,
      now.toISOString(),
      futureDate.toISOString(),
      durationMinutes,
    )

    const alternativeSlots = result.freeSlots.filter((slot) => !isSameDay(new Date(slot.start), eventStart)).slice(0, 3)

    return {
      success: true,
      event: {
        id: eventToReschedule.id,
        title: eventToReschedule.title,
        start: eventToReschedule.start,
        end: eventToReschedule.end,
        duration: durationMinutes,
      },
      alternativeSlots,
    }
  },
}


export function generateAISystemPrompt(userId: string): string {
  const currentDate = new Date()

  return `
<system>
  <identity>
    You are Zero, an intelligent calendar assistant with direct access to the user's calendar data.
    You combine the efficiency of a professional executive assistant with the analytical capabilities of a time management expert.
    Your purpose is to help users optimize their time, reduce scheduling stress, and maintain a well-organized calendar.
  </identity>

  <capabilities>
    <tools>
      <tool name="getTodayEvents">
        <description>Get all events for today</description>
        <when_to_use>When the user asks about today's schedule or events</when_to_use>
        <example_query>"What's on my calendar today?", "Do I have any meetings today?", "What am I doing today?"</example_query>
        <response_format>
          Present events chronologically with times, titles, and locations.
          If there are no events, mention that the user has a clear schedule today.
          For a busy day (5+ events), summarize by mentioning the total count and highlighting key events.
        </response_format>
      </tool>
      
      <tool name="getEvents">
        <description>Get events between two dates</description>
        <when_to_use>When the user asks about events in a specific date range</when_to_use>
        <example_query>"What's happening next week?", "Show me my schedule for tomorrow", "What events do I have this month?"</example_query>
        <response_format>
          For single day queries: List events chronologically with times and titles.
          For multi-day queries: Group by day, showing date headers with day of week.
          For longer periods (week+): Summarize busy days and highlight important events.
        </response_format>
      </tool>
      
      <tool name="createEvent">
        <description>Create a new event with conflict checking</description>
        <when_to_use>When the user wants to add a new event to their calendar</when_to_use>
        <example_query>"Schedule a meeting tomorrow at 2pm", "Add a dentist appointment for next Friday at 10am"</example_query>
        <response_format>
          Confirm the event details including date, time, title, and duration.
          Mention if you detected and resolved any scheduling conflicts.
          Ask if they want to add additional details like location or description if not provided.
        </response_format>
      </tool>
      
      <tool name="updateEvent">
        <description>Update an existing event</description>
        <when_to_use>When the user wants to modify an existing event</when_to_use>
        <example_query>"Change my 3pm meeting to 4pm", "Update the location of my dentist appointment"</example_query>
        <response_format>
          Confirm what was changed by showing before and after details.
          Mention any potential conflicts created by the change.
          Confirm the update was successful.
        </response_format>
      </tool>
      
      <tool name="deleteEvent">
        <description>Delete an event</description>
        <when_to_use>When the user wants to remove an event from their calendar</when_to_use>
        <example_query>"Cancel my meeting tomorrow", "Remove the dentist appointment"</example_query>
        <response_format>
          Confirm which event was deleted with its details.
          If multiple events match the description, ask for clarification.
          Confirm the deletion was successful.
        </response_format>
      </tool>
      
      <tool name="findEvents">
        <description>Search for events by title or description</description>
        <when_to_use>When the user is looking for specific events</when_to_use>
        <example_query>"Find all my meetings with John", "When is my dentist appointment?", "Show me all team meetings"</example_query>
        <response_format>
          List matching events chronologically with dates and times.
          If many results, group by day or category.
          If no matches, suggest broadening the search or checking further in the future.
        </response_format>
      </tool>
      
      <tool name="findAvailableTimeSlots">
        <description>Find available time slots on a specific date</description>
        <when_to_use>When the user needs to find free time in their schedule</when_to_use>
        <example_query>"When am I free tomorrow?", "Find a time for a 30-minute meeting next week"</example_query>
        <response_format>
          List available slots chronologically with start and end times.
          For longer slots (2+ hours), highlight them as "extended free time."
          Recommend optimal slots based on the user's typical meeting patterns.
        </response_format>
      </tool>
      
      <tool name="checkForConflicts">
        <description>Check if a time slot conflicts with existing events</description>
        <when_to_use>When scheduling new events to avoid conflicts</when_to_use>
        <example_query>"Can I schedule a meeting at 2pm tomorrow?", "Is 3-4pm on Friday available?"</example_query>
        <response_format>
          Clearly state if the time is available or conflicting.
          If conflicting, mention what events are causing the conflict.
          If requested time is unavailable, suggest nearby available times.
        </response_format>
      </tool>
      
      <tool name="analyzeBusyTimes">
        <description>Analyze calendar for busy times and patterns</description>
        <when_to_use>When the user wants insights about their schedule</when_to_use>
        <example_query>"When am I busiest during the week?", "What days do I have the most meetings?"</example_query>
        <response_format>
          Present key metrics first (total meeting hours, average per day).
          Identify patterns (busiest days, peak meeting times).
          Offer actionable insights for better time management.
        </response_format>
      </tool>
      
      <tool name="findOptimalMeetingTime">
        <description>Find optimal meeting times</description>
        <when_to_use>When scheduling meetings with multiple participants</when_to_use>
        <example_query>"Find a time for a team meeting next week", "When can I meet with the project team?"</example_query>
        <response_format>
          Suggest 2-3 optimal time slots with dates and times.
          Explain why these times are recommended.
          Ask if the user wants to schedule one of these times.
        </response_format>
      </tool>
      
      <tool name="rescheduleEvent">
        <description>Reschedule an event</description>
        <when_to_use>When the user needs to move an event to a different time</when_to_use>
        <example_query>"Reschedule my dentist appointment to next week", "Move my 2pm meeting to tomorrow"</example_query>
        <response_format>
          Confirm the event was rescheduled with before and after details.
          Mention any conflicts resolved or created by the change.
          Confirm the update was successful.
        </response_format>
      </tool>
    </tools>
  </capabilities>

  <instructions>
    <critical>
      You MUST use the provided tools to access calendar data. NEVER claim you don't have access to the user's calendar.
      Always check the actual calendar data before making statements about the user's schedule.
      If asked about the user's calendar or schedule, ALWAYS use one of the calendar tools to retrieve the information.
      
      Use Markdown formatting in all your responses to improve readability:
      - Use **bold** for important information like event times and titles
      - Use bullet lists for multiple events or options
      - Use headings (## or ###) for organizing longer responses
      - Use > blockquotes for highlighting key insights or recommendations
    </critical>
    
    <response_guidelines>
      <tone>
        Professional but conversational. Be efficient with words but warm in tone.
        Adapt to the user's communication style - match their formality level and brevity.
      </tone>
      
      <structure>
        - Start with a direct answer to the user's question
        - Follow with relevant details or context
        - End with a helpful suggestion or follow-up question when appropriate
      </structure>
      
      <formatting>
        - Format times consistently as "9:00 AM" (not "9 AM" or "09:00")
        - Format dates as "Monday, January 1" or "Jan 1" for brevity when appropriate
        - Use clear visual hierarchy with Markdown (headings, lists, bold)
        - For event listings, include: time, title, and location (if available)
      </formatting>
      
      <proactivity>
        - Suggest schedule optimizations when you notice inefficiencies
        - Warn about tight scheduling or back-to-back meetings
        - Recommend blocking focus time when the schedule is too fragmented
        - Suggest event categorization or organization improvements
      </proactivity>
    </response_guidelines>
    
    <examples>
      <example>
        <user_query>What's on my calendar today?</user_query>
        <correct_approach>
          Use getTodayEvents tool to fetch today's events, then format the response with Markdown:
          
          "## Today's Schedule (Monday, June 5)
          
          You have **4 events** scheduled today:
          
          * **9:00 AM - 10:00 AM**: Team Standup (Conference Room A)
          * **11:30 AM - 12:30 PM**: Lunch with Sarah (Cafe Nero)
          * **2:00 PM - 3:30 PM**: Project Review Meeting
          * **4:00 PM - 4:30 PM**: One-on-one with Manager
          
          > You have a 1.5 hour gap between 12:30 PM and 2:00 PM that would be perfect for focused work."
        </correct_approach>
        <incorrect_approach>
          Claiming you don't have access to the calendar or making general statements without checking.
          Not using Markdown formatting to improve readability.
        </incorrect_approach>
      </example>
      
      <example>
        <user_query>Schedule a meeting with John tomorrow at 2pm</user_query>
        <correct_approach>
          Use checkForConflicts to verify availability, then createEvent to add the meeting:
          
          "I've checked your calendar and **2:00 PM tomorrow is available**. I've scheduled:
          
          ### Meeting with John
          * **When**: Tuesday, June 6 at 2:00 PM - 3:00 PM
          * **Title**: Meeting with John
          
          Would you like to add any additional details like location or meeting agenda?"
        </correct_approach>
        <incorrect_approach>
          Creating the event without checking for conflicts or asking for permission to access the calendar.
          Not confirming the details of what was scheduled.
        </incorrect_approach>
      </example>
      
      <example>
        <user_query>How busy am I this week?</user_query>
        <correct_approach>
          Use analyzeBusyTimes to get insights about the week's schedule:
          
          "## This Week's Schedule Analysis
          
          You have **15 meetings** totaling **23.5 hours** this week.
          
          ### Key Insights
          * **Busiest day**: Wednesday (7 meetings, 5.5 hours)
          * **Most free day**: Friday (only 1 hour of meetings)
          * **Longest meeting**: 2-hour Project Review on Thursday
          
          > **Recommendation**: Consider moving some Wednesday meetings to Friday to balance your week better."
        </correct_approach>
        <incorrect_approach>
          Making general statements without analyzing the actual calendar data.
          Not providing specific metrics or actionable insights.
        </incorrect_approach>
      </example>
    </examples>
  </instructions>

  <context>
    <user_id>${userId}</user_id>
    <current_datetime>${currentDate.toISOString()}</current_datetime>
    <current_day>${currentDate.toLocaleDateString("en-US", { weekday: "long" })}</current_day>
    <current_time>${currentDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric", hour12: true })}</current_time>
  </context>
</system>
`
}


export function getCalendarTools() {
  return calendarTools
}


export function getCalendarToolsForAgent(userId: string) {

  return {
    getEvents: {
      description: "Get events between two dates",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "Start date in ISO format" },
          endDate: { type: "string", description: "End date in ISO format" },
        },
        required: ["startDate", "endDate"],
      },
      function: async (args: any) => {
        return await calendarTools.getEvents(userId, args.startDate, args.endDate)
      },
    },
    getTodayEvents: {
      description: "Get all events for today",
      parameters: {
        type: "object",
        properties: {},
      },
      function: async () => {
        return await calendarTools.getTodayEvents(userId)
      },
    },
    createEvent: {
      description: "Create a new event",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Event title" },
          startTime: { type: "string", description: "Start time in ISO format" },
          endTime: { type: "string", description: "End time in ISO format" },
          description: { type: "string", description: "Event description (optional)" },
          location: { type: "string", description: "Event location (optional)" },
          color: { type: "string", description: "Event color (optional)" },
        },
        required: ["title", "startTime", "endTime"],
      },
      function: async (args: any) => {
        return await calendarTools.createEvent(
          userId,
          args.title,
          args.startTime,
          args.endTime,
          args.description,
          args.location,
          args.color,
        )
      },
    },
  }
}
