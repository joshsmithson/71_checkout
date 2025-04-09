// Middleware configuration
export const config = {
  // Only run middleware on these paths
  // Explicitly exclude all static assets and known routes
  matcher: [
    // Include these paths
    '/',
    '/game/:path*',
    '/stats',
    '/leaderboard',
    '/profile',
    
    // Exclude all static files with extensions and special routes
    '/((?!_next/static|_next/image|favicon.ico|assets/|sounds/|favicon.svg|manifest.json|.*\\.html|.*\\.js|.*\\.css|.*\\.map|.*\\.json|.*\\.svg|.*\\.txt|.*\\.mp3|basic|debug).*)'
  ],
}; 