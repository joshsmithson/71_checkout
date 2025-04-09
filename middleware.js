// Minimal middleware that avoids infinite redirects
export default function middleware(request) {
  try {
    // Log request details
    const url = new URL(request.url);
    const path = url.pathname;
    console.log(`[Middleware] Request: ${path}`);
    
    // Skip middleware for all static assets and HTML files
    if (path.includes('.') || path === '/basic' || path === '/debug') {
      console.log(`[Middleware] Skipping middleware for static file: ${path}`);
      return; // Return undefined to skip middleware
    }
    
    // For SPA routes, let Vercel handle them via the rewrites in vercel.json
    // Just add headers without interfering with content delivery
    return new Response(undefined, {
      headers: {
        'X-Middleware-Info': 'Dart Counter middleware'
      }
    });
  } catch (error) {
    console.error(`[Middleware] Error: ${error.message}`);
    return; // Skip middleware on error
  }
} 