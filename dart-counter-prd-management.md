# Dart Counter Web App - PRD Management Document

## 1. Project Overview

The Dart Counter Web App is a mobile-friendly web application designed for tracking scores during casual pub dart games. It offers a comprehensive solution for dart enthusiasts, providing features such as score tracking, game setup with varying difficulty levels, checkout suggestions, player statistics, and leaderboards.

## 2. Technical Stack

### 2.1 Frontend
- **Framework**: React.js (with TypeScript)
- **UI Library**: Material-UI (MUI) with custom dark theme
- **State Management**: React Context API for global state
- **Routing**: React Router for navigation
- **Animation**: Framer Motion for smooth transitions
- **Forms**: React Hook Form for form handling
- **Styling**: Emotion (via MUI) for styled components

### 2.2 Backend & Database
- **BaaS**: Supabase for backend services
- **Authentication**: Supabase Auth with Google OAuth
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage for user-generated content
- **Real-time Updates**: Supabase Realtime for subscription-based updates
- **API**: Auto-generated RESTful API through Supabase

### 2.3 Development & Deployment
- **Build Tool**: Vite for fast development and optimized production builds
- **TypeScript**: For type safety and improved developer experience
- **Hosting**: Vercel for frontend deployment
- **Version Control**: Git
- **Testing**: Jest and React Testing Library (planned)
- **CI/CD**: GitHub Actions (planned)

## 3. Application Architecture

### 3.1 Frontend Architecture
- **Component Structure**: Follows atomic design principles
  - Layout components (bottom navigation, containers)
  - Auth components (login, protected routes)
  - Game components (score entry, player selection, game controls)
  - Statistics components (charts, data displays)
- **State Management**:
  - `AuthContext`: Manages user authentication state
  - `UIContext`: Manages UI preferences and settings
  - Local component state: For component-specific state
- **Custom Hooks**:
  - `useSupabase`: Encapsulates Supabase client operations for data access

### 3.2 Database Schema
- **users**: Auth users table (managed by Supabase Auth)
- **friends**: For non-app users added by authenticated users
- **games**: Game sessions with type, status, and timestamps
- **game_players**: Links players to games with order and winner status
- **turns**: Individual turns within games with scores and checkout status
- **statistics**: Player performance metrics across different game types
- **rivals**: Head-to-head statistics between players

### 3.3 Data Flow
1. User authenticates via Google OAuth
2. App fetches user data and previous games on login
3. Game setup creates new game record with selected players
4. Score entry updates turns table and calculates remaining score
5. Game completion updates statistics and rivalry records
6. Real-time subscriptions keep UI in sync with database changes

## 4. User Interface

### 4.1 Design System
- **Theme**: Dark mode by default with high contrast for pub visibility
- **Color Palette**:
  - Primary: Vibrant red (#E53935)
  - Secondary: Blue (#1E88E5)
  - Success: Green (#43A047)
  - Warning: Amber (#FFB300)
  - Background: Dark charcoal (#121212)
  - Cards: Slightly lighter (#1E1E1E)
- **Typography**:
  - Font Family: Roboto
  - Display (Game Scores): 48px, Bold
  - Headers: 24px, Medium
  - Body: 16px, Regular
- **Components**:
  - Cards with rounded corners (8dp radius)
  - Pill-shaped buttons for primary actions
  - Bottom navigation for main app sections

### 4.2 Key Screens
- **Login**: Google authentication
- **Home/Dashboard**: Recent games, quick actions, statistics highlights
- **Game Setup**: Game type selection, player selection, handicap options
- **Active Game**: Current player indicator, score entry, checkout suggestions
- **Statistics**: Performance metrics, game history, visualizations
- **Leaderboard**: Rankings among friends
- **Profile**: User settings and preferences

### 4.3 Responsive Design
- **Mobile-First**: Optimized for use in pub environments on mobile devices
- **Touch-Optimized**: Large touch targets for ease of use while holding drinks
- **Progressive Enhancement**: Additional features for tablet/desktop views

## 5. Feature Set

### 5.1 Authentication
- Google OAuth login
- User profile management
- Friend profile creation for non-app users

### 5.2 Game Management
- Game type selection (301, 501, 701)
- Player selection with randomized order option
- Custom handicaps with different starting scores
- Game pause/resume functionality
- Turn history with edit capabilities

### 5.3 Score Tracking
- Intuitive dart score entry system
- Running score calculation
- Checkout suggestions for remaining scores
- Turn-by-turn history
- Undo functionality for mistake correction

### 5.4 Statistics & Analysis
- Player performance metrics:
  - Average score per throw
  - Checkout percentages
  - Highest scores
  - Win/loss records
  - 180s thrown
- Game history with detailed turn data
- Head-to-head rivalry tracking

### 5.5 Special Features
- "180 Button" with celebration animation
- Customizable UI preferences
- Light/dark mode toggle
- Offline capability (planned with PWA implementation)

## 6. Implementation Status

### 6.1 Completed Components
- Authentication flow with Google OAuth
- Basic application routing with protected routes
- UI theme and global styling
- Bottom navigation
- Error boundary for graceful error handling

### 6.2 In Progress
- Game setup screen
- Active game functionality
- Score entry interface
- Player statistics tracking

### 6.3 Planned Features
- Enhanced rivalry tracking
- Advanced statistics visualizations
- Offline mode with background synchronization
- Social sharing of achievements
- PWA installation support

## 7. Development Workflow

### 7.1 Repository Structure
- `/src`: Source code
  - `/components`: Reusable UI components
  - `/contexts`: React Context providers
  - `/hooks`: Custom React hooks
  - `/pages`: Main application views
  - `/utils`: Helper functions and utilities
  - `/types`: TypeScript type definitions
- `/public`: Static assets
- Configuration files at root level

### 7.2 Environment Setup
- `.env.example` provides template for required environment variables:
  - `VITE_SUPABASE_URL`: Supabase project URL
  - `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key for client-side operations

### 7.3 Build & Deployment
- Development: `npm run dev` (Vite dev server)
- Production build: `npm run build`
- Post-build process creates SPA fallback and copies static assets

## 8. Security Considerations

### 8.1 Authentication Security
- JWT-based authentication managed by Supabase
- Server-side session validation
- Automatic token refresh

### 8.2 Data Access Controls
- Row Level Security (RLS) policies in Supabase
- Users can only access their own data and games they've created
- Friend profiles linked to creator accounts

### 8.3 Frontend Security
- Environment variables for sensitive configuration
- Error boundaries to prevent complete app crashes
- Input validation on all forms

## 9. Performance Optimization

### 9.1 Current Optimizations
- Vite for fast builds and hot module replacement
- Code splitting via React Router
- Optimized bundle size through dependencies management

### 9.2 Planned Optimizations
- Image optimization for avatars and assets
- Service Worker for offline capabilities
- Memoization of expensive calculations
- Local caching of frequently accessed data


## 11. Testing Strategy

### 11.1 Current Testing
- Manual testing of core functionality
- Basic error handling and validation

### 11.2 Planned Testing
- Unit tests with Jest
- Component tests with React Testing Library
- End-to-end tests for critical user flows
- Performance testing for mobile devices

## 12. Future Roadmap

### 12.1 Short-term Goals
- Complete core game functionality
- Enhance statistics visualization
- Implement offline mode basics
- Add user preference persistence

### 12.2 Mid-term Goals
- Social features (friend invitations, sharing)
- Additional game variants
- Enhanced leaderboards with seasonal rankings
- Push notifications for game reminders

### 12.3 Long-term Vision
- Multi-player real-time games
- Tournament organization features
- Integration with professional dart statistics
- Coaching insights and improvement suggestions

## 13. Conclusion

The Dart Counter Web App represents a comprehensive solution for casual dart players looking to enhance their game experience with professional-level scoring and statistics. With its intuitive interface, rich feature set, and mobile-first design, it addresses the specific needs of players in pub environments while offering advanced functionality for enthusiasts wanting to track their improvement over time. 