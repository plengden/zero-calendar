import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl


  const protectedPaths = ["/calendar", "/settings"]
  const isPathProtected = protectedPaths.some((path) => pathname.startsWith(path))

  if (isPathProtected) {
    const token = await getToken({ req: request })


    if (!token) {
      const url = new URL(`/auth/signin`, request.url)
      url.searchParams.set("callbackUrl", encodeURI(pathname))
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
}
