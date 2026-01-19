import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Public paths that don't require auth
  const publicPaths = ['/login', '/signup', '/verify-email', '/forgot-password', '/invite']
  
  // Check if path is public
  if (publicPaths.some(path => pathname.startsWith(path))) {
    // If logged in, redirect to dashboard? Optional.
    // For now, let them access login if they want (or redirect if token exists)
    const token = request.cookies.get('accessToken')?.value
    if (token && pathname === '/login') {
       return NextResponse.redirect(new URL('/overview', request.url))
    }
    return NextResponse.next()
  }

  // Check for Next.js internal paths or static assets
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/static') || 
    pathname.includes('.') // file extension (images, etc)
  ) {
    return NextResponse.next()
  }

  // Check auth cookie
  const token = request.cookies.get('accessToken')?.value

  if (!token) {
    // Redirect to login if no token
    const loginUrl = new URL('/login', request.url)
    // loginUrl.searchParams.set('from', pathname) // Optional: preserve redirect
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes if any)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
