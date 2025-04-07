// Middleware to handle auth redirects and SPA routing
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (static files)
     * 4. /assets (assets files)
     * 5. /favicon.ico, /manifest.json, /robots.txt, etc.
     */
    '/((?!api|_next|_static|assets|favicon.ico|manifest.json|robots.txt).*)',
  ],
};

export default function middleware(req: NextRequest) {
  // Clone the request headers
  const requestHeaders = new Headers(req.headers);
  
  // Set a custom header to help debug
  requestHeaders.set('x-middleware-cache', 'no-cache');
  
  // Return the response with the modified headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
} 