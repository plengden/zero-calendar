"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { generateEventSuggestion } from "@/lib/ai"
import { createEvent } from "@/lib/calendar"
import type { CalendarEvent } from "@/types/calendar"
import { Loader2 } from "lucide-react"

interface NaturalLanguageEventDialogProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onEventCreated?: (event: CalendarEvent) => void
}

export function NaturalLanguageEventDialog({
  isOpen,
  onClose,
  userId,
  onEventCreated,
}: NaturalLanguageEventDialogProps) {
  const [description, setDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description.trim()) {
      setError("Please enter a description")
      return
    }

    setIsLoading(true)
    setError(null)

    try {

      const suggestion = await generateEventSuggestion(description)


      const newEvent = await createEvent({
        userId,
        title: suggestion.title || "New Event",
        description: suggestion.description,
        start: suggestion.start || new Date().toISOString(),
        end: suggestion.end || new Date(Date.now() + 3600000).toISOString(),
        location: suggestion.location,
        allDay: false,
        color: "#3b82f6",
      })

      toast({
        title: "Event created",
        description: `Successfully created "${newEvent.title}"`,
      })

      if (onEventCreated) {
        onEventCreated(newEvent)
      }

      setDescription("")
      onClose()
    } catch (err) {
      console.error("Error creating event:", err)
      setError(err instanceof Error ? err.message : "Failed to create event")

      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Event with Natural Language</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Textarea
            placeholder="Describe your event in natural language. For example: 'Meeting with John tomorrow at 2pm for 1 hour to discuss the project'"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full"
            disabled={isLoading}
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !description.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Event"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
