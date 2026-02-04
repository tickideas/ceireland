import { NextRequest, NextResponse } from 'next/server'

const CSRF_COOKIE = 'csrf-token'
const CSRF_HEADER = 'x-csrf-token'

function generateToken() {
  return crypto.randomUUID()
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAdminPage = pathname.startsWith('/admin')
  const isAdminApi = pathname.startsWith('/api/admin')

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next()
  }

  const csrfCookie = request.cookies.get(CSRF_COOKIE)?.value

  // For admin page requests, ensure csrf cookie exists
  if (isAdminPage) {
    if (!csrfCookie) {
      const response = NextResponse.next()
      response.cookies.set(CSRF_COOKIE, generateToken(), {
        httpOnly: false,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      })
      return response
    }
    return NextResponse.next()
  }

  // For admin API, validate CSRF on state-changing requests
  if (isAdminApi && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const headerToken = request.headers.get(CSRF_HEADER)
    if (!csrfCookie || !headerToken || csrfCookie !== headerToken) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
