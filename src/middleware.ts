import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (path.startsWith('/@')) {
    const username = path.slice(2)
    return NextResponse.rewrite(new URL('/' + username, request.url))
  }

  const visited = request.cookies.get('fluxo_onboarded')
  if (path === '/' && !visited) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/@:username*', '/onboarding'],
}
