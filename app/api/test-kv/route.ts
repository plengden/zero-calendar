import { NextResponse } from "next/server"
import { testKvConnection } from "@/lib/kv-config"

export async function GET() {
  const result = await testKvConnection()

  return NextResponse.json(result)
}
