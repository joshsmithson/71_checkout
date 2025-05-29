// Script to combine SQL files for easy deployment to Supabase
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read SQL files from the organized database directory
const readSQLFile = (category, filename) => {
  const filePath = join(__dirname, 'database', category, filename);
  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}`);
    return '';
  }
};

// Main SQL files to deploy
const sqlFiles = [
  { category: 'schema', file: 'supabase-schema.sql', description: 'Database Schema' },
  { category: 'functions', file: 'supabase-functions.sql', description: 'Main Functions' },
  { category: 'functions', file: 'reconcile-function.sql', description: 'Statistics Reconciliation Function' },
  { category: 'functions', file: 'delete-friend-function.sql', description: 'Friend Deletion Function' }
];

// Output file
const outputFile = 'deploy-database.sql';

// Combine all SQL content
let combinedSQL = `-- Dart Counter Database Deployment
-- Generated on: ${new Date().toISOString()}
-- 
-- This file contains the complete database structure and functions
-- Deploy this to Supabase via the SQL Editor

`;

sqlFiles.forEach(({ category, file, description }) => {
  const content = readSQLFile(category, file);
  if (content.trim()) {
    combinedSQL += `-- ===============================================
-- ${description}
-- File: database/${category}/${file}
-- ===============================================

${content}

`;
  }
});

// Write to output file
writeFileSync(join(__dirname, outputFile), combinedSQL);
console.log(`✅ Database deployment file created: ${outputFile}`);
console.log('📁 Total files combined:', sqlFiles.length);
console.log('📄 Output size:', Math.round(combinedSQL.length / 1024), 'KB');
console.log('\n🚀 To deploy:');
console.log('1. Copy the contents of deploy-database.sql');
console.log('2. Go to Supabase Dashboard > SQL Editor');
console.log('3. Paste and run the SQL');
console.log('\n📂 Individual files are organized in:');
console.log('- database/schema/ - Database tables and structure');
console.log('- database/functions/ - PostgreSQL functions');
console.log('- database/migrations/ - Historical migration files'); 