import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { decode } from "next-auth/jwt"

export async function middleware(req: NextRequest) {
  const secret = process.env.AUTH_SECRET || "BPzBK2X54QAuW0KEfUlDBVPuxaIPn9YtXXtqKwmztZ4="
  
  const sessionToken = 
    req.cookies.get("authjs.session-token")?.value || 
    req.cookies.get("__Secure-authjs.session-token")?.value
    
  const salt = req.cookies.get("__Secure-authjs.session-token") 
    ? "__Secure-authjs.session-token" 
    : "authjs.session-token"

  let decoded = null
  if (sessionToken) {
    try {
      decoded = await decode({
        token: sessionToken,
        secret,
        salt,
      })
    } catch (err) {
      console.error("[Middleware manual decode error]:", err)
    }
  }

  const isLoggedIn = !!decoded
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard")
  const isOnAuthPage = req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/signup"

  console.log(
    `[Middleware] Path: ${req.nextUrl.pathname} | isLoggedIn: ${isLoggedIn}`
  )

  if (isOnDashboard) {
    if (isLoggedIn) return NextResponse.next()
    return NextResponse.redirect(new URL("/login", req.url))
  } else if (isOnAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard/organizations", req.url))
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
}

