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

4. Initialize your Supabase project and run the SQL migrations from `schema.sql` and `functions.sql`.

5. Start the development server:

```bash
npm run dev
```

## Database Structure

The application uses the following tables in Supabase:

- **users**: User authentication and profiles (managed by Supabase Auth)
- **friends**: Non-app users that participate in games
- **games**: Game instances
- **game_players**: Links players to games
- **turns**: Individual turns in a game
- **statistics**: Player performance metrics
- **rivals**: Head-to-head player relationships

## License

MIT 