// Enhanced middleware with debugging
export default function middleware(request) {
  try {
    // Get the URL and path from the request
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Log request details (will appear in Vercel function logs)
    console.log(`[Middleware] Processing request for ${path}`);
    
    // For static HTML files in the public folder, don't interfere 
    if (path === '/debug.html' || path === '/basic.html' || path.includes('favicon') || 
        path.startsWith('/assets/') || path.includes('.svg') || path.includes('.json') || 
        path.includes('.css') || path.includes('.js') || path.includes('.map') || 
        path.includes('.mp3') || path.includes('.txt')) {
      console.log(`[Middleware] Passing through static asset: ${path}`);
      return;
    }
    
    // For the root path or any non-asset path, serve index.html
    console.log(`[Middleware] Serving as SPA route: ${path}`);
    
    // If it's the root path, add diagnostics header
    const headers = {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Middleware-Info': 'Processed by Dart Counter middleware'
    };
    
    return new Response(null, { headers });
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
        <p>Try accessing <a href="/basic.html" style="color: #E53935;">basic.html</a> instead.</p>
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