# Dart Counter Web App - Software Requirements Specification

## System Design
- **Application Type**: Progressive Web App (PWA)
- **Deployment Strategy**: Cloud-based with offline capabilities
- **Scalability Considerations**: Horizontal scaling for user growth
- **Performance Targets**: 
  - Initial load < 2 seconds
  - Score updates < 100ms
  - Animations smooth at 60fps
- **Security Requirements**:
  - User authentication via OAuth
  - Data encryption for sensitive information
  - HTTPS enforcement

## Architecture Pattern
- **Frontend**: React with functional components
- **Pattern**: Context API + Custom Hooks pattern with Supabase client
- **Component Structure**:
  - Atomic design principles (atoms, molecules, organisms, templates, pages)
  - Custom hooks for Supabase data operations
  - Context providers for shared state
- **Key Modules**:
  - Authentication module (Supabase Auth)
  - Game management module
  - Score tracking module
  - Statistics and analysis module
  - User and friend profile module
- **Testing Strategy**:
  - Unit tests with Jest
  - Component tests with React Testing Library
  - E2E tests with Cypress
  - Supabase local emulator for backend testing

## State Management
- **Global State**: Combination of React Context and Supabase real-time subscriptions
- **Local State**: React hooks (useState, useReducer) for component-specific state
- **Persistence**: 
  - Supabase for cloud storage
  - LocalStorage/SessionStorage for offline capabilities
  - Supabase offline support for background synchronization
- **Key State Contexts**:
  - Authentication context (leveraging Supabase Auth)
  - Current game context
  - Player profiles context
  - Statistics context
  - UI context (theme, animations, sound settings)
- **Side Effects Management**: React Query for data fetching, caching, and synchronization with Supabase

## Data Flow
- **Client-Server Communication**: 
  - Supabase data access APIs for CRUD operations
  - Supabase Realtime for subscription-based updates
  - PostgreSQL functions for complex server-side operations
- **Data Synchronization**:
  - Optimistic UI updates with React Query
  - Offline support with background sync via Supabase
  - Conflict resolution through PostgreSQL transactions
- **Key Data Flows**:
  1. User authentication flow (handled by Supabase Auth)
  2. Game creation and setup flow
  3. Score entry and validation flow
  4. Statistics calculation and update flow (via PostgreSQL functions)
  5. Leaderboard and rivalry tracking flow (real-time updates)

## Technical Stack
- **Frontend**:
  - Framework: React.js
  - UI Component Library: Material-UI with custom theming
  - State Management: React Context API + React Query
  - Backend Integration: Supabase JS Client
  - Routing: React Router
  - Forms: React Hook Form
  - Animations: Framer Motion
- **Backend**:
  - Platform: Supabase (Backend as a Service)
  - API: Supabase Auto-generated RESTful API
  - Real-time: Supabase Realtime for subscription-based updates
  - Storage: Supabase Storage for user-generated content (photos)
- **Database**:
  - Primary: PostgreSQL (via Supabase)
  - Caching: Leveraging Supabase's built-in caching mechanisms
- **Deployment & DevOps**:
  - CI/CD: GitHub Actions
  - Frontend Hosting: Vercel or Netlify
  - Backend/Database: Supabase Platform
  - Monitoring: Sentry for error tracking
  - Database Migrations: Managed through Supabase Migration Tools
- **Testing**:
  - Unit/Integration: Jest
  - E2E: Cypress
  - Performance: Lighthouse

## Authentication Process
- **Provider**: Supabase Auth with Google OAuth 2.0
- **Token Management**:
  - JWT handling managed by Supabase client
  - Automatic token refresh
  - Role-based permissions using Supabase RLS (Row Level Security)
- **Authentication Flow**:
  1. User initiates login via Google button
  2. Supabase Auth handles OAuth redirect and callback
  3. Token verification handled by Supabase
  4. JWT stored securely in local storage (managed by Supabase client)
  5. Client-side state update with user info
- **Security Measures**:
  - Row Level Security policies in database
  - Server-side validation via Supabase Functions
  - Automatic session timeouts
  - Passwordless magic link option as backup authentication method

## Route Design
- **Public Routes**:
  - `/` - Landing page
  - `/login` - Authentication page
  - `/about` - App information
- **Protected Routes**:
  - `/dashboard` - User home screen
  - `/game/new` - Game setup
  - `/game/:id` - Active game
  - `/game/:id/history` - Game turn history
  - `/stats` - Personal statistics
  - `/stats/:friendId` - Friend statistics
  - `/leaderboard` - Global and friend leaderboards
  - `/rivals` - Rivalry tracking
  - `/profile` - User profile management
  - `/settings` - App settings

## API Design
- **Base**: Supabase auto-generated RESTful API and client library
- **Authentication API**:
  - Handled entirely by Supabase Auth client methods:
  - `supabase.auth.signInWithOAuth({ provider: 'google' })`
  - `supabase.auth.signOut()`
  - `supabase.auth.getUser()`
- **Data Access Pattern**:
  - Direct table access via Supabase client with built-in RLS:
  - `supabase.from('table_name').select().eq('column', 'value')`
  - Use of Postgres functions for complex operations
- **Main Endpoints** (via Supabase client):
  - **Users & Friends**:
    - `supabase.from('users').select()`
    - `supabase.from('friends').select().eq('creator_id', userId)`
  - **Games & Turns**:
    - `supabase.from('games').insert({ /* game data */ })`
    - `supabase.from('games').select().eq('creator_id', userId).order('created_at', { ascending: false })`
    - `supabase.from('turns').select().eq('game_id', gameId)`
    - `supabase.from('turns').update({ /* updated data */ }).eq('id', turnId)`
  - **Statistics & Leaderboards**:
    - `supabase.from('statistics').select().eq('player_id', userId)`
    - `supabase.rpc('calculate_leaderboard', { user_id: userId })`
    - `supabase.rpc('get_rivalry_stats', { player1_id: id1, player2_id: id2 })`
- **Real-time Subscriptions**:
  - `supabase.channel('game-updates').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: 'id=eq.' + gameId }, callback).subscribe()`

## Database Design ERD
- **users Table** (Supabase Auth Users):
  - `id`: UUID (primary key, from Auth)
  - `email`: Text (unique)
  - `name`: Text
  - `avatar_url`: Text
  - `preferences`: JSONB (theme, sound, etc.)
  - `created_at`: Timestamp
  - `last_login`: Timestamp

- **friends Table** (for non-app users):
  - `id`: UUID (primary key)
  - `name`: Text
  - `creator_id`: UUID (foreign key to users.id)
  - `avatar_url`: Text (optional)
  - `created_at`: Timestamp
  - `last_played`: Timestamp

- **games Table**:
  - `id`: UUID (primary key)
  - `type`: Text (301, 501, 701)
  - `creator_id`: UUID (foreign key to users.id)
  - `status`: Text (active, paused, completed)
  - `started_at`: Timestamp
  - `completed_at`: Timestamp (nullable)
  - `created_at`: Timestamp

- **game_players Table**:
  - `id`: UUID (primary key)
  - `game_id`: UUID (foreign key to games.id)
  - `player_id`: UUID (foreign key to users.id or friends.id)
  - `player_type`: Text (user/friend)
  - `starting_score`: Integer
  - `order`: Integer
  - `winner`: Boolean
  - `created_at`: Timestamp

- **turns Table**:
  - `id`: UUID (primary key)
  - `game_id`: UUID (foreign key to games.id)
  - `player_id`: UUID (foreign key to users.id or friends.id)
  - `player_type`: Text (user/friend)
  - `turn_number`: Integer
  - `scores`: Integer[] (array of individual dart scores)
  - `remaining`: Integer
  - `checkout`: Boolean
  - `created_at`: Timestamp
  - `edited`: Boolean
  - `edited_at`: Timestamp (nullable)

- **statistics Table**:
  - `id`: UUID (primary key)
  - `player_id`: UUID (foreign key to users.id or friends.id)
  - `player_type`: Text (user/friend)
  - `game_type`: Text (301, 501, 701)
  - `games_played`: Integer
  - `games_won`: Integer
  - `total_score`: Integer
  - `highest_turn`: Integer
  - `checkout_percentage`: Numeric
  - `average_per_dart`: Numeric
  - `count_180`: Integer
  - `last_updated`: Timestamp

- **rivals Table**:
  - `id`: UUID (primary key)
  - `player1_id`: UUID (foreign key to users.id or friends.id)
  - `player2_id`: UUID (foreign key to users.id or friends.id)
  - `player1_type`: Text (user/friend)
  - `player2_type`: Text (user/friend)
  - `player1_wins`: Integer
  - `player2_wins`: Integer
  - `last_game_id`: UUID (foreign key to games.id)
  - `highlighted`: Boolean
  - `creator_id`: UUID (foreign key to users.id)
  - `created_at`: Timestamp

- **RLS Policies**:
  - Users can only read/write their own user data
  - Users can only read/write friends they created
  - Users can only read/write games they created
  - Users can read public statistics for all players
  - Users can only update rivalries they created
