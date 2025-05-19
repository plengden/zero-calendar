import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getUserCategories } from "@/lib/calendar"

export async function GET(req: NextRequest) {
  try {

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }


    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")


    if (!userId || userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }


    const calendars = await getUserCategories(userId)

    return NextResponse.json({ calendars })
  } catch (error) {
    console.error("Error fetching calendars:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
