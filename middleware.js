export default function middleware(request) {
  // Get the URL and path from the request
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Don't interfere with asset requests
  if (path.startsWith('/assets/') || path.includes('.')) {
    return;
  }
  
  // For all other routes, serve the index.html content with proper headers
  return new Response(null, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
} 