// Script to combine SQL files for easy deployment to Supabase
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Files to include
const sqlFiles = [
  'supabase-migrations/revert-statistics-for-deleted-game.sql',
  'supabase-migrations/recalculate-statistics-on-delete.sql',
  'supabase-migrations/recalculate-all-statistics.sql'
];

// Output file
const outputFile = 'deploy-sql-changes.sql';

// Combine files
let combinedSql = '-- Combined SQL for deployment\n';
combinedSql += `-- Generated at: ${new Date().toISOString()}\n\n`;

sqlFiles.forEach(file => {
  const filePath = join(__dirname, file);
  try {
    const sqlContent = readFileSync(filePath, 'utf8');
    combinedSql += `-- Source: ${file}\n`;
    combinedSql += sqlContent;
    combinedSql += '\n\n';
    console.log(`Added content from ${file}`);
  } catch (err) {
    console.error(`Error reading file ${file}:`, err);
  }
});

// Write to output file
writeFileSync(join(__dirname, outputFile), combinedSql);
console.log(`Combined SQL written to ${outputFile}`); 