import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const visited = request.cookies.get('fluxo_onboarded')
  const isOnboarding = request.nextUrl.pathname === '/onboarding'
  const isRoot = request.nextUrl.pathname === '/'

  if (isRoot && !visited) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/onboarding'],
}
