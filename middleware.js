// Vercel middleware to handle authentication and redirects
export default function middleware(req) {
  const url = new URL(req.url);
  
  // Set security headers for all responses
  const response = new Response();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Handle Supabase auth callback
  if (url.pathname.startsWith('/auth/callback')) {
    return response;
  }
  
  return response;
} 