import { NextResponse } from "next/server"
import { testKvConnection } from "@/lib/kv-config"

export async function GET() {
  const kvTest = await testKvConnection()


  const safeEnvVars = Object.keys(process.env).reduce((acc, key) => {

    if (key.includes("TOKEN") || key.includes("SECRET") || key.includes("KEY")) {
      acc[key] = process.env[key] ? "[SET]" : "[NOT SET]"
    } else {
      acc[key] = process.env[key]
    }
    return acc
  }, {})

  return NextResponse.json({
    kvTest,
    environment: process.env.NODE_ENV,
    environmentVariables: safeEnvVars,
    timestamp: new Date().toISOString(),
  })
}
