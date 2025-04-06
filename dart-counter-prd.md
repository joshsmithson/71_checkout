# Dart Counter Web App - Product Requirements Document

## 1. Elevator Pitch
A mobile-friendly dart counter web app that solves the problem of tracking scores during casual pub dart games. Users can log in, set up games with varying difficulty levels (301, 501, 701), enter scores via an intuitive interface, and receive checkout suggestions. The app tracks detailed statistics for both the main user and their friends, maintains a leaderboard for competitive play, and includes fun features like a celebratory "180 button" with fake phone call animation. Perfect for dart enthusiasts who want to enhance their pub games with professional-level score tracking and statistics.

## 2. Who is this app for?
- **Primary users**: Casual to serious dart players who play in pubs or social settings
- **Secondary users**: Friends of the primary user who participate in games but don't log in themselves
- **Age range**: 18+ (pub context)
- **Usage context**: Mobile devices in potentially dimly lit, noisy environments
- **Technical proficiency**: Low to medium - interface must be extremely user-friendly
- **Frequency of use**: Weekly (for regular dart nights) to monthly (for occasional players)

## 3. Functional Requirements

### Authentication
- Google OAuth login
- User profile management
- Creation and management of "friend profiles" for players who don't use the app

### Game Setup
- Game type selection (301, 501, 701)
- Player selection (logged-in user + friends)
- Randomized playing order generation
- Custom handicap options (different starting scores for different players)

### Gameplay
- Intuitive dart score entry system
- Running score calculation
- Turn tracking and player rotation
- Checkout suggestions based on remaining score
- Advanced undo functionality for correcting errors at turn level
- Option to edit any previous turn in the current game
- Pause and resume game functionality

### Statistics & History
- Detailed statistics tracking per player:
  - Average score per throw
  - Checkout percentage
  - Highest score in a turn
  - Most frequent hit numbers
  - Win/loss record
  - 180s thrown
  - Checkout success rate
  - Average darts per leg
- Game history log
- Leaderboard functionality
- Multi-user rivalry tracking system
- Head-to-head statistics between any players in the system

### Special Features
- "180 Button" with fake phone call animation and audio celebration
- Optional audio confirmations for successful throws
- Photo capture option for memorable throws
- Light/dark mode toggle for different lighting conditions

## 4. User Stories

### Authentication
- **As a user**, I want to log in with my Google account so that I can quickly access the app without creating a new account.
- **As a user**, I want to create profiles for my friends so that I can track their statistics even when they don't use the app.

### Game Setup
- **As a user**, I want to select between different game types (301, 501, 701) so that I can play my preferred variant.
- **As a user**, I want to quickly select players from my friends list so that I can set up a game efficiently.
- **As a user**, I want the app to randomize playing order so that we have fair and varied games.
- **As a user**, I want to set different starting scores for different players so that we can handicap games for mixed skill levels.

### Gameplay
- **As a user**, I want to easily enter dart scores by tapping on a dartboard or using quick-input buttons so that I can keep the game moving.
- **As a user**, I want to see my remaining score clearly so that I know what I need to hit next.
- **As a user**, I want checkout suggestions so that I can plan my throws strategically.
- **As a user**, I want to be able to undo mistakes immediately after entry so that incorrect inputs don't ruin the game.
- **As a user**, I want to access and edit any previous turn in the current game so that I can correct errors discovered later.
- **As a user**, I want to pause a game and come back to it later so that interruptions don't mean starting over.

### Statistics & History
- **As a user**, I want to see detailed statistics about my performance so that I can track my improvement.
- **As a user**, I want to view game history so that I can remember past games and analyze my play.
- **As a user**, I want to see a leaderboard showing who has the most wins so that we can maintain friendly competition.
- **As a user**, I want to see head-to-head records between any players in the system so that we can track multiple rivalries.
- **As a user**, I want to highlight specific rivalries for quick access so I can follow the most interesting player matchups.

### Special Features
- **As a user**, I want to press a "180 button" when I throw a perfect score so that I can celebrate in a fun way.
- **As a user**, I want to take a photo when I make a great throw so that I can remember it.
- **As a user**, I want to use the app in dark environments so I need a dark mode option.

## 5. User Interface

### General Design Principles
- Clean, modern aesthetic
- High contrast for pub visibility
- Large touch targets for ease of use while holding drinks
- Minimal text entry required
- Responsive design optimized for mobile
- Dark mode as default with light mode option

### Key Screens

#### Login Screen
- Simple interface with Google OAuth button
- App logo and brief value proposition
- Option to continue as guest (limited functionality)

#### Home/Dashboard
- Quick "Start New Game" button
- Recent games summary
- Personal statistics highlights
- Access to leaderboard
- Settings access

#### Game Setup
- Game type selector (301/501/701)
- Player selection interface with:
  - Recently played with friends
  - Option to add new friends
  - Checkboxes for player selection
- Handicap options (collapsible advanced section)
- "Start Game" button

#### Active Game Screen
- Clear display of current player
- Large, visible remaining score
- Dartboard visual input option
- Numerical input grid alternative
- Checkout suggestions when applicable
- Undo button for immediate correction of the current turn
- Turn history access for editing previous turns
- Visual indication of edited turns
- 180 celebration button (appears only when applicable)
- Game controls (pause, end game, etc.)

#### Score Entry Panel
- Simple grid of common scores
- Option for precise scoring via dartboard visual
- Quick-action buttons (miss, bull, 180)
- Confirmation of entry

#### Statistics Dashboard
- Filterable by date range and game type
- Graphical representation of key stats
- Detailed breakdown of performance
- Multi-player comparison feature
- Customizable rivalry tracking between any two or more players
- Rivalry metrics (win percentage, average score difference, etc.)
- Exportable reports

#### Leaderboard
- Global rank among friends
- Win percentages
- Recent game outcomes
- Filter by game type and time period

### Special UI Elements
- "180 Button": Large, prominent button that appears when a player has the opportunity to throw a 180
- Fake incoming call animation with humorous caller names
- Audio celebration that plays when the "call" is answered
- Checkout suggestion panel that displays when player is within checkout range
- Dark/light mode toggle with automatic detection option
