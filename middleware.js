export default function middleware(request) {
  const url = new URL(request.url);
  
  // Set Content-Type header for HTML responses
  if (url.pathname === '/' || url.pathname.endsWith('.html') || !url.pathname.includes('.')) {
    return new Response(null, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }
  
  // Continue with the default response for other file types
  return new Response();
} 