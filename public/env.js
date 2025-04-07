// This file will be loaded by index.html before the main bundle
// It creates window.__ENV to ensure environment variables are available
window.__ENV = window.__ENV || {};

// Add a placeholder for environment variables - Vercel will replace these
window.__ENV.VITE_SUPABASE_URL = "{{VITE_SUPABASE_URL}}";
window.__ENV.VITE_SUPABASE_ANON_KEY = "{{VITE_SUPABASE_ANON_KEY}}";
window.__ENV.DEPLOYED_AT = "{{DEPLOYED_AT}}";

// Add runtime environment info
window.__ENV.RUNTIME_INFO = {
  userAgent: navigator.userAgent,
  href: window.location.href,
  hostname: window.location.hostname,
  timestamp: new Date().toISOString()
};

// Log for debugging
console.log("ENV.JS loaded, __ENV object initialized", { 
  url_present: !!window.__ENV.VITE_SUPABASE_URL,
  key_present: !!window.__ENV.VITE_SUPABASE_ANON_KEY
}); 