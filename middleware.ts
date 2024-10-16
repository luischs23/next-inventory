import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: ['/api/:path*', '/changes', '/store/:path*', '/warehouses/:path*'],
  runtime: 'experimental-edge', // This enables Edge Runtime
}

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  
  // Add custom headers
  requestHeaders.set('x-hello-from-middleware', 'hello')

  // Basic auth for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
      return new NextResponse(
        JSON.stringify({ success: false, message: 'authentication failed' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      )
    }
  }

  // Rate limiting for store pages
  if (request.nextUrl.pathname.startsWith('/companies/')) {
    const ip = request.ip ?? '127.0.0.1'
    const rateLimit = await getRateLimit(ip)
    if (!rateLimit.success) {
      return new NextResponse(
        JSON.stringify({ success: false, message: 'rate limit exceeded' }),
        { status: 429, headers: { 'content-type': 'application/json' } }
      )
    }
    requestHeaders.set('x-rate-limit-remaining', rateLimit.remaining.toString())
  }

  // Redirect legacy URLs
  if (request.nextUrl.pathname === '/old-page') {
    return NextResponse.redirect(new URL('/new-page', request.url))
  }

  // Rewrite for A/B testing
  if (request.nextUrl.pathname === '/features') {
    const bucket = Math.random() < 0.5 ? 'a' : 'b';
    requestHeaders.set('x-bucket', bucket)
    if (bucket === 'b') {
      return NextResponse.rewrite(new URL('/features-b', request.url))
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

// Mock function for rate limiting
async function getRateLimit(ip: string): Promise<{ success: boolean, remaining: number }> {
  // In a real application, this would check against a database or cache
  return { success: true, remaining: 100 }
}