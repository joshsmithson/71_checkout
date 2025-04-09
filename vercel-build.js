import { writeFileSync, copyFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Ensure we're running in the build context
if (process.env.VERCEL) {
  console.log('🔄 Running Vercel-specific build steps...');
  
  // Make sure dist directory exists
  const distDir = join(process.cwd(), 'dist');
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }
  
  // Create a 404.html that's identical to index.html for SPA routing
  try {
    const indexPath = join(distDir, 'index.html');
    if (existsSync(indexPath)) {
      const indexContent = readFileSync(indexPath, 'utf8');
      writeFileSync(join(distDir, '404.html'), indexContent);
      console.log('✅ Created 404.html as an alias to index.html for SPA routing');
    } else {
      console.error('❌ Could not find index.html in dist directory');
    }
  } catch (error) {
    console.error('❌ Error preparing SPA routing:', error);
  }

  // Create or update _redirects for SPA routing
  try {
    writeFileSync(join(distDir, '_redirects'), '/* /index.html 200\n');
    console.log('✅ Created _redirects for SPA routing');
  } catch (error) {
    console.error('❌ Error creating _redirects:', error);
  }

  console.log('✅ SPA build setup completed');
}
