#!/bin/bash

echo "=== Dart Counter Build Process ==="
echo "Build started at: $(date)"

# Check environment variables
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

# Ensure React 18 is being used
if ! grep -q "\"react\": \"\^18" package.json; then
  echo "⚠️ Updating React version in package.json to ensure compatibility..."
  sed -i 's/"react": "[^"]*"/"react": "^18.2.0"/g' package.json
  sed -i 's/"react-dom": "[^"]*"/"react-dom": "^18.2.0"/g' package.json
fi

# Simple direct build
echo "Running build with Vite..."
vite build

# Verify the build
if [ -f "dist/index.html" ]; then
  echo "✅ Build completed successfully!"
else
  echo "❌ ERROR: index.html not found in dist folder!"
fi

echo "Build completed at: $(date)" 