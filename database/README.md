# Database Structure

This directory contains all SQL files organized by purpose.

## Directory Structure

### `/schema`
Contains the main database schema definition:
- `supabase-schema.sql` - Core database tables and relationships

### `/functions` 
Contains all Supabase/PostgreSQL functions:
- `supabase-functions.sql` - Main functions (checkout suggestions, statistics, etc.)
- `delete-friend-function.sql` - Friend deletion with cascade cleanup
- `reconcile-function.sql` - Statistics reconciliation function

### `/migrations`
Contains database migration files in chronological order:
- `recalculate-all-statistics.sql` - Bulk statistics recalculation
- `recalculate-statistics-on-delete.sql` - Statistics update on game deletion
- `revert-statistics-for-deleted-game.sql` - Statistics cleanup for deleted games
- `fix-average-dart-calculation.sql` - Bug fix for average dart calculation

## Deployment

To deploy any of these files to Supabase:

1. **Via Supabase Dashboard:**
   - Go to SQL Editor
   - Copy/paste the SQL content
   - Run the query

2. **Via Supabase CLI:**
   ```bash
   supabase db reset --linked
   ```

## File Naming Convention

- **Schema files:** `<descriptive-name>.sql`
- **Function files:** `<function-purpose>-function.sql` 
- **Migration files:** `<timestamp>-<description>.sql` (future migrations)

## Notes

- All functions in `/functions` have been deployed to production
- Migration files represent historical changes and bug fixes
- Always test functions in staging/development before deploying to production 