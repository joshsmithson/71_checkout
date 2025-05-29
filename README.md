# Dart Counter Web App

A mobile-friendly dart counter web app that solves the problem of tracking scores during casual pub dart games. Users can log in, set up games with varying difficulty levels (301, 501, 701), enter scores via an intuitive interface, and receive checkout suggestions.

## Features

- **Authentication**: Google OAuth login
- **Game Management**: Create and manage different game types (301, 501, 701)
- **Scoring**: Intuitive dart score entry with running calculations
- **Statistics**: Detailed tracking of player performance
- **Checkout Suggestions**: Automatic suggestions based on remaining score
- **Multi-player**: Support for adding friends who don't use the app
- **Leaderboard**: Track performance across players
- **Rivalry Tracking**: Head-to-head statistics
- **Special Features**: "180 Button" celebration with animation

## Tech Stack

- **Frontend**: React with TypeScript
- **UI Framework**: Material-UI
- **State Management**: React Context API
- **Backend**: Supabase (PostgreSQL + Auth)
- **Animations**: Framer Motion
- **Build Tool**: Vite

## Setup Instructions

1. Clone the repository:

```bash
git clone <repository-url>
cd dart-counter
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory and add your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

4. **Deploy the database structure:**

```bash
# Generate deployment file
node deploy-sql.js

# Then copy the contents of deploy-database.sql to Supabase SQL Editor and run it
```

5. Start the development server:

```bash
npm run dev
```

## Database Structure

The application uses the following organized structure:

- **`database/schema/`** - Core database tables and relationships
- **`database/functions/`** - PostgreSQL/Supabase functions
- **`database/migrations/`** - Historical migration files

### Core Tables:
- **users**: User authentication and profiles (managed by Supabase Auth)
- **friends**: Non-app users that participate in games
- **games**: Game instances
- **game_players**: Links players to games
- **turns**: Individual turns in a game
- **statistics**: Player performance metrics
- **rivals**: Head-to-head player relationships

## Vercel Deployment

This application is configured to deploy on Vercel. You need to add the following environment variables in your Vercel project settings:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Steps to deploy:

1. Link your GitHub repository to Vercel
2. Add the environment variables in the Vercel project settings
3. Deploy the project

### Troubleshooting

If you see a blank page after deployment:

1. Check the browser console for errors
2. Verify that your environment variables are correctly set in Vercel
3. Make sure your Supabase project is running and accessible
4. Check if your application is correctly building locally with `npm run build`

## License

MIT 