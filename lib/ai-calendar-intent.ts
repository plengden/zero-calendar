import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"


export type CalendarIntent =
  | { type: "create_event"; eventDetails: CalendarEventDetails }
  | { type: "update_event"; eventIdentifier: string; updates: Partial<CalendarEventDetails> }
  | { type: "delete_event"; eventIdentifier: string }
  | { type: "query_events"; timeRange?: TimeRange; query?: string }
  | { type: "find_availability"; timeRange?: TimeRange; duration?: number }
  | { type: "other"; query: string }

export interface CalendarEventDetails {
  title: string
  startTime: string
  endTime: string
  description?: string
  location?: string
  color?: string
  allDay?: boolean
}

export interface TimeRange {
  startDate: string
  endDate: string
}


export async function processCalendarIntent(message: string, timeoutMs = 5000): Promise<CalendarIntent> {
  try {

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Intent processing timed out")), timeoutMs)
    })


    const intentPromise = (async () => {

      const systemPrompt = `
      You are a calendar assistant that extracts structured data from natural language requests.
      Your task is to analyze the user's message and determine their intent related to calendar operations.
      You must output a valid JSON object representing the detected intent and relevant details.

The possible intents are:
1. create_event - User wants to create a new calendar event
2. update_event - User wants to update an existing event
3. delete_event - User wants to delete an event
4. query_events - User is asking about events or their schedule
5. find_availability - User wants to find available time slots
6. other - Any other calendar-related query that doesn't fit the above

For each intent, extract the relevant details:

For create_event:
{
  "type": "create_event",
  "eventDetails": {
    "title": "string",
    "startTime": "ISO string",
    "endTime": "ISO string",
    "description": "string",
    "location": "string",
    "allDay": boolean
  }
}

For update_event:
{
  "type": "update_event",
  "eventIdentifier": "string",
  "updates": {

    "title": "string",
    "startTime": "ISO string",
    "endTime": "ISO string",
    "description": "string",
    "location": "string",
    "allDay": boolean
  }
}

For delete_event:
{
  "type": "delete_event",
  "eventIdentifier": "string"
}

For query_events:
{
  "type": "query_events",
  "timeRange": {
    "startDate": "ISO string",
    "endDate": "ISO string"
  },
  "query": "string"
}

For find_availability:
{
  "type": "find_availability",
  "timeRange": {
    "startDate": "ISO string",
    "endDate": "ISO string"
  },
  "duration": number
}

For other:
{
  "type": "other",
  "query": "string"
}

Current date and time: ${new Date().toISOString()}

IMPORTANT GUIDELINES:
- Always return a valid JSON object
- Use ISO format for dates and times
- For dates without specific times mentioned, use appropriate defaults (9:00 AM for morning, 12:00 PM for afternoon, etc.)
- For events without a specified duration, default to 1 hour
- If a specific time is mentioned (like "11:00 AM"), do NOT make it an all-day event
- If no specific time is mentioned and it seems like an all-day event, set allDay to true
- Extract as much detail as possible from the message
- If the intent is unclear, default to "other"
- Do not include any explanations or text outside the JSON object
- CRITICAL: When a specific time is mentioned (like "11am" or "3pm"), you MUST use that exact time in the startTime field
- If the user is asking about existing events (like "when do I have a meeting with X"), classify it as "query_events" and include the query
- CRITICAL: When handling times, always preserve the exact time mentioned by the user. If they say "12pm" or "noon", the time must be 12:00, not converted to another time zone or format.
- IMPORTANT: For queries like "when do I have a meeting with Alex", make sure to include "Alex" in the query field.
`


      const response = await generateText({
        model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
        prompt: message,
        system: systemPrompt,
        temperature: 0.2,
        maxTokens: 1000,
      })


      const jsonMatch = response.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error("Failed to extract JSON from AI response")
        return { type: "other", query: message }
      }

      try {

        const intentData = JSON.parse(jsonMatch[0]) as CalendarIntent


        if (!intentData.type) {
          console.error("Missing intent type in AI response")
          return { type: "other", query: message }
        }


        if (intentData.type === "create_event" && (!intentData.eventDetails || !intentData.eventDetails.title)) {
          console.error("Missing required fields for create_event intent")
          return { type: "other", query: message }
        }

        if (intentData.type === "update_event" && (!intentData.eventIdentifier || !intentData.updates)) {
          console.error("Missing required fields for update_event intent")
          return { type: "other", query: message }
        }

        if (intentData.type === "delete_event" && !intentData.eventIdentifier) {
          console.error("Missing required fields for delete_event intent")
          return { type: "other", query: message }
        }


        if (intentData.type === "create_event") {
          const extractedTime = extractTimeFromMessage(message)
          if (extractedTime) {
            console.log("Manually extracted time:", extractedTime)


            const aiDate = new Date(intentData.eventDetails.startTime)


            const correctedDate = new Date(aiDate)


            correctedDate.setUTCHours(extractedTime.hour)
            correctedDate.setUTCMinutes(extractedTime.minute)
            correctedDate.setUTCSeconds(0)
            correctedDate.setUTCMilliseconds(0)

            console.log("Original AI date:", aiDate.toISOString())
            console.log("Corrected date with extracted time:", correctedDate.toISOString())


            intentData.eventDetails.startTime = correctedDate.toISOString()


            const endTime = new Date(correctedDate)
            endTime.setUTCHours(endTime.getUTCHours() + 1)
            intentData.eventDetails.endTime = endTime.toISOString()

            console.log("Final startTime:", intentData.eventDetails.startTime)
            console.log("Final endTime:", intentData.eventDetails.endTime)
          }
        }


        if (intentData.type === "update_event" && intentData.updates.startTime) {
          const extractedTime = extractTimeFromMessage(message)
          if (extractedTime) {
            console.log("Manually extracted time for update:", extractedTime)


            const aiDate = new Date(intentData.updates.startTime)


            const correctedDate = new Date(aiDate)


            correctedDate.setUTCHours(extractedTime.hour)
            correctedDate.setUTCMinutes(extractedTime.minute)
            correctedDate.setUTCSeconds(0)
            correctedDate.setUTCMilliseconds(0)


            intentData.updates.startTime = correctedDate.toISOString()


            if (intentData.updates.endTime) {
              const endTime = new Date(correctedDate)
              endTime.setUTCHours(endTime.getUTCHours() + 1)
              intentData.updates.endTime = endTime.toISOString()
            }
          }
        }


        if (intentData.type === "query_events" && !intentData.query) {

          const searchTerms = extractSearchTerms(message)
          if (searchTerms) {
            intentData.query = searchTerms
            console.log("Extracted search terms for query:", searchTerms)
          }
        }

        return intentData
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError)
        return { type: "other", query: message }
      }
    })()


    return await Promise.race([intentPromise, timeoutPromise])
  } catch (error) {
    console.error("Error processing calendar intent:", error)
    if (error instanceof Error && error.message === "Intent processing timed out") {

      return extractBasicIntent(message)
    }
    return { type: "other", query: message }
  }
}


function extractSearchTerms(message: string): string | null {
  const lowerMessage = message.toLowerCase()


  const withPatterns = [
    /(?:meeting|appointment|event|call)\s+(?:with|for)\s+([a-z0-9\s]+)/i,
    /(?:with|for)\s+([a-z0-9\s]+)/i,
    /\b(alex|john|mary|sarah|michael|david|lisa|emma|james|robert|william|joseph|charles|thomas|daniel|matthew|andrew|christopher|joshua|timothy|george|kenneth|paul|mark|donald|steven|edward|brian|ronald|anthony|kevin|jason|jeff|gary|timothy|jose|larry|jeffrey|frank|scott|eric|stephen|jacob|raymond|patrick|sean|adam|jerry|dennis|tyler|samuel|gregory|henry|douglas|peter|joe|arthur|jack|dennis|walter|aaron|jose|albert|kyle|louis|russell|philip|howard|eugene|bobby|carlos|johnny|gerald|wayne|harry|ralph|roy|ryan|joe|justin|willie|jordan|jeremy|alan|billy|bruce|bryan|carl|vincent|terry|keith|lawrence|harold|roger|noah|christian|austin|tony|leonard|randy|craig|jonathan|micheal|todd|earl|jesse|benjamin|curtis|travis|bradley|dylan|herbert|lance|fredrick|joel|norman|leroy|marvin|glen|leslie|elliot|melvin|cecil|wade|edwin|milton|kurt|clifford|jay|willard|darrell|ross|brent|shane|marion|tracy|seth|kent|terrance|sergio|gilbert|dean|jorge|dan|derrick|brett|angelo|tony|marco|kirk|lloyd|nathan|orlando|rafael|alberto|omar|clifton|willard|daryl|ross|marshall|salvador|perry|kirk|lloyd|seth|kent|terrance|sergio|gilbert|dean|jorge|dan|derrick|brett|angelo|tony|marco|kirk|lloyd|nathan|orlando|rafael|alberto|omar|clifton|willard|daryl|ross|marshall|salvador|perry|kirk|lloyd)\b/i,
  ]

  for (const pattern of withPatterns) {
    const match = lowerMessage.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }


  const aboutPatterns = [/about\s+([a-z0-9\s]+)/i, /regarding\s+([a-z0-9\s]+)/i, /related to\s+([a-z0-9\s]+)/i]

  for (const pattern of aboutPatterns) {
    const match = lowerMessage.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return null
}


export function extractTimeFromMessage(message: string): { hour: number; minute: number } | null {
  const lowerMessage = message.toLowerCase()


  const timePatterns = [
    /(\d{1,2})(?::(\d{1,2}))?\s*(?:am|a\.m\.)/i,
    /(\d{1,2})(?::(\d{1,2}))?\s*(?:pm|p\.m\.)/i,
    /(\d{1,2})(?::(\d{1,2}))\s*(?:hours|hrs|h)/i,
    /at\s+(\d{1,2})(?::(\d{1,2}))?\s*(?:am|a\.m\.|pm|p\.m\.)?/i,
    /(\d{1,2})(?::(\d{1,2}))?\s*o'clock/i, // o'clock format
    /(\d{1,2})(?::(\d{1,2}))?$/i,
  ]


  if (lowerMessage.includes("noon") || lowerMessage.includes("12pm") || lowerMessage.includes("12 pm")) {
    return { hour: 12, minute: 0 }
  }

  if (lowerMessage.includes("midnight")) {
    return { hour: 0, minute: 0 }
  }

  for (const pattern of timePatterns) {
    const match = lowerMessage.match(pattern)
    if (match) {
      let hour = Number.parseInt(match[1], 10)
      const minute = match[2] ? Number.parseInt(match[2], 10) : 0


      const isPM = match[0].toLowerCase().includes("pm") || match[0].toLowerCase().includes("p.m.")
      if (isPM && hour < 12) {
        hour += 12
      } else if (
        !isPM &&
        hour === 12 &&
        (match[0].toLowerCase().includes("am") || match[0].toLowerCase().includes("a.m."))
      ) {
        hour = 0
      }


      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return { hour, minute }
      }
    }
  }


  if (lowerMessage.includes("morning")) {
    return { hour: 9, minute: 0 }
  } else if (lowerMessage.includes("afternoon")) {
    return { hour: 14, minute: 0 }
  } else if (lowerMessage.includes("evening")) {
    return { hour: 18, minute: 0 }
  } else if (lowerMessage.includes("night")) {
    return { hour: 20, minute: 0 }
  }

  return null
}


function extractBasicIntent(message: string): CalendarIntent {
  const lowerMessage = message.toLowerCase()


  if (isEventQuery(message)) {

    const searchTerms = extractSearchTerms(message)


    const today = new Date()
    const nextMonth = new Date(today)
    nextMonth.setMonth(today.getMonth() + 1)

    return {
      type: "query_events",
      query: searchTerms || undefined,
      timeRange: {
        startDate: today.toISOString(),
        endDate: nextMonth.toISOString(),
      },
    }
  }


  if (lowerMessage.includes("schedule") || lowerMessage.includes("create") || lowerMessage.includes("add")) {

    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)


    const extractedTime = extractTimeFromMessage(message)
    if (extractedTime) {

      tomorrow.setUTCHours(extractedTime.hour, extractedTime.minute, 0, 0)
    } else {

      tomorrow.setUTCHours(9, 0, 0, 0)
    }


    const endTime = new Date(tomorrow)
    endTime.setUTCHours(endTime.getUTCHours() + 1)


    let title = "Meeting"
    if (lowerMessage.includes("with")) {
      const withMatch = lowerMessage.match(/with\s+([^,.]+)/i)
      if (withMatch && withMatch[1]) {
        title = `Meeting with ${withMatch[1].trim()}`
      }
    }


    let location = undefined
    if (lowerMessage.includes("at ")) {
      const atMatch = lowerMessage.match(
        /at\s+([^,.]+(?:valley|building|office|center|centre|park|room|hall|street|st|avenue|ave|road|rd|drive|dr|place|plaza|square|conference|hotel))/i,
      )
      if (atMatch && atMatch[1]) {
        location = atMatch[1].trim()
      }
    }

    return {
      type: "create_event",
      eventDetails: {
        title,
        startTime: tomorrow.toISOString(),
        endTime: endTime.toISOString(),
        location,
        allDay: false,
      },
    }
  }


  return { type: "other", query: message }
}


function isEventQuery(message: string): boolean {
  const lowerMessage = message.toLowerCase()


  const queryPatterns = [
    /when (do|does|is|are|will)/i,
    /what (events|meetings|appointments)/i,
    /show me/i,
    /tell me about/i,
    /do i have/i,
    /is there/i,
    /are there/i,
    /find/i,
    /search/i,
    /look up/i,
    /check/i,
    /any (events|meetings|appointments)/i,
    /my (schedule|calendar|events|meetings|appointments)/i,
    /what's on/i,
    /what is on/i,
    /what do i have/i,
    /during the/i,
    /this (week|month|day)/i,
    /next (week|month|day)/i,
    /upcoming/i,
    /meet(ing)? with/i,
    /appointment with/i,
    /call with/i,
  ]


  return queryPatterns.some((pattern) => pattern.test(lowerMessage))
}


export function normalizeTimeRange(timeRange?: TimeRange): TimeRange | undefined {
  if (!timeRange) return undefined

  try {

    const startDate = new Date(timeRange.startDate).toISOString()
    const endDate = new Date(timeRange.endDate).toISOString()

    return { startDate, endDate }
  } catch (error) {
    console.error("Error normalizing time range:", error)
    return timeRange
  }
}


export async function findEventByIdentifier(
  userId: string,
  eventIdentifier: string,
  getEvents: Function,
): Promise<any> {
  try {

    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - 7)

    const endDate = new Date(today)
    endDate.setDate(today.getDate() + 30)

    const events = await getEvents(userId, startDate.toISOString(), endDate.toISOString())

    if (!events || events.length === 0) {
      return null
    }

    const lowerIdentifier = eventIdentifier.toLowerCase()


    const exactMatch = events.find((event: any) => event.title && event.title.toLowerCase() === lowerIdentifier)

    if (exactMatch) {
      return exactMatch
    }


    const partialMatch = events.find((event: any) => event.title && event.title.toLowerCase().includes(lowerIdentifier))

    if (partialMatch) {
      return partialMatch
    }


    if (lowerIdentifier.includes("today")) {

      const todayEvents = events.filter((event: any) => {
        const eventDate = new Date(event.start)
        return (
          eventDate.getDate() === today.getDate() &&
          eventDate.getMonth() === today.getMonth() &&
          eventDate.getFullYear() === today.getFullYear()
        )
      })

      if (todayEvents.length === 1) {
        return todayEvents[0]
      }


      if (todayEvents.length > 0) {
        return todayEvents[0]
      }
    }


    if (lowerIdentifier.includes("tomorrow")) {
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)


      const tomorrowEvents = events.filter((event: any) => {
        const eventDate = new Date(event.start)
        return (
          eventDate.getDate() === tomorrow.getDate() &&
          eventDate.getMonth() === tomorrow.getMonth() &&
          eventDate.getFullYear() === tomorrow.getFullYear()
        )
      })

      if (tomorrowEvents.length === 1) {
        return tomorrowEvents[0]
      }


      if (tomorrowEvents.length > 0) {
        return tomorrowEvents[0]
      }
    }


    return null
  } catch (error) {
    console.error("Error finding event by identifier:", error)
    return null
  }
}
