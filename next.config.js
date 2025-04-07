// next.config.js
module.exports = {
  // React strict mode
  reactStrictMode: true,
  
  // Enable SWC minification
  swcMinify: true,
  
  // Configure asset prefix for CDN support
  assetPrefix: process.env.ASSET_PREFIX || '',
  
  // Modify HTTP headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  
  // Configure redirects
  async redirects() {
    return [
      // Use redirects for handling auth flows if needed
    ];
  },
  
  // Configure rewrites for SPA behavior
  async rewrites() {
    return {
      // These rewrites are checked after both pages/public files
      // and dynamic routes are checked
      fallback: [
        // This rewrite will handle all paths that aren't handled by
        // pages/public files/dynamic routes and send them to index
        {
          source: '/:path*',
          destination: '/',
        },
      ],
    };
  },
}; 