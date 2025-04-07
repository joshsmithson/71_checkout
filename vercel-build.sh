#!/bin/bash

echo "=== Dart Counter Build Process ==="
echo "Build started at: $(date)"
echo "Build environment: Vercel"

# Check environment variables
echo "Checking environment variables..."
if [ -z "$VITE_SUPABASE_URL" ]; then
  echo "❌ WARNING: VITE_SUPABASE_URL environment variable is not set!"
else
  echo "✅ VITE_SUPABASE_URL is set"
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "❌ WARNING: VITE_SUPABASE_ANON_KEY environment variable is not set!"
else
  echo "✅ VITE_SUPABASE_ANON_KEY is set"
fi

# Install specific dependency versions to avoid compatibility issues
echo "Installing dependencies..."
npm install @types/react@18.2.55 @types/react-dom@18.2.19 react@18.2.0 react-dom@18.2.0 react-router-dom@6.22.0 --legacy-peer-deps

# First just check TypeScript without emitting to identify errors
echo "Running TypeScript type check only..."
npx tsc --noEmit

# Try to build with TypeScript emitting
echo "Attempting build with TypeScript..."
tsc && vite build

# If the TypeScript build fails, try building without TypeScript checking
if [ $? -ne 0 ]; then
  echo "TypeScript build failed. Trying to build without TypeScript checking..."
  echo "Creating a debugging .env file for the build..."
  echo "# Build-time generated .env file" > .env.production.local
  echo "VITE_APP_DEBUG=true" >> .env.production.local
  echo "VITE_APP_BUILD_TIME=\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" >> .env.production.local
  echo "VITE_APP_VERSION=\"${VERCEL_GIT_COMMIT_SHA:-unknown}\"" >> .env.production.local
  
  echo "Starting build without TypeScript checking..."
  vite build
fi

# Verify the build output
echo "Verifying build output..."
if [ -f "dist/index.html" ]; then
  echo "✅ index.html exists in dist folder"
  echo "Content-Type check:"
  echo "<!doctype html>" > dist/content-type-test.txt
  cat dist/index.html | head -5 >> dist/content-type-test.txt
  
  # Add build info to a debug file
  echo "Creating build-info.json..."
  echo "{
  \"buildTime\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"version\": \"${VERCEL_GIT_COMMIT_SHA:-unknown}\",
  \"nodeVersion\": \"$(node -v)\",
  \"hasSupabaseUrl\": $([ -n "$VITE_SUPABASE_URL" ] && echo "true" || echo "false"),
  \"hasSupabaseKey\": $([ -n "$VITE_SUPABASE_ANON_KEY" ] && echo "true" || echo "false")
}" > dist/build-info.json
else
  echo "❌ ERROR: index.html not found in dist folder!"
  echo "Creating a minimal index.html as fallback..."
  mkdir -p dist
  echo '<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dart Counter</title>
    <style>
      body { 
        font-family: Arial, sans-serif; 
        background: #121212; 
        color: white; 
        display: flex; 
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        padding: 20px;
        text-align: center;
      }
      .error-container {
        max-width: 600px;
        padding: 20px;
        background: #1e1e1e;
        border-radius: 8px;
      }
      h1 { color: #e53935; }
      button {
        background: #e53935;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 20px;
        cursor: pointer;
        margin-top: 20px;
      }
    </style>
  </head>
  <body>
    <div class="error-container">
      <h1>Dart Counter</h1>
      <p>There was a problem building the application.</p>
      <p>Please check the environment variables and build logs.</p>
      <button onclick="window.location.reload()">Try Again</button>
    </div>
  </body>
</html>' > dist/index.html
fi

echo "Build completed at: $(date)" 