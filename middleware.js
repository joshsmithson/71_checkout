// Enhanced middleware with debugging
export default function middleware(request) {
  try {
    // Get the URL and path from the request
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Log request details (will appear in Vercel function logs)
    console.log(`[Middleware] Processing request for ${path}`);
    
    // Don't intercept ANY static files or HTML files from public
    // This is a critical fix - don't process ANY files that should be served directly
    if (path.includes('.') || path === '/basic' || path === '/debug') {
      console.log(`[Middleware] Bypassing middleware for: ${path}`);
      return; // Return undefined to skip middleware processing
    }
    
    // For the root path or any non-asset path, route to index.html
    console.log(`[Middleware] Handling SPA route: ${path}`);
    
    // Only set headers for SPA routes, don't attempt to serve content
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Middleware-Info': 'Processed by Dart Counter middleware'
    };
    
    // Important: for SPA routes, rewrite to the index.html but DON'T set Content-Type
    // Let Vercel handle the actual serving of the content
    return Response.redirect(new URL('/', request.url), 307);
  } catch (error) {
    console.error('[Middleware] Error:', error);
    
    // Return a basic response in case of error
    return new Response(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Middleware Error</title>
        <style>
          body { font-family: sans-serif; padding: 20px; background: #121212; color: white; }
          h1 { color: #E53935; }
          pre { background: #1E1E1E; padding: 10px; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>Middleware Error</h1>
        <p>The middleware encountered an error processing your request.</p>
        <pre>${error.message}</pre>
        <p>Path: ${request.url}</p>
      </body>
      </html>
    `, {
      status: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  }
} 