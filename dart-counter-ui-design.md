# Dart Counter Web App - User Interface Design Document

## Layout Structure

The Dart Counter app follows a card-based minimalist design approach with dark mode as the default. The interface is organized with a clear hierarchy that makes it easy to navigate and use in pub environments.

### Global Structure
- **Primary Navigation**: Fixed bottom navigation bar with 4 main sections (Home, New Game, Statistics, Profile)
- **Content Area**: Main screen area with card-based components
- **Modal Overlays**: Used for focused tasks like score entry, confirmations, and celebrations
- **Header**: Minimal persistent header with page title and contextual actions

### Screen Hierarchy
1. **Login/Welcome Screen**: Full-screen with centered content
2. **Home Dashboard**: Card grid layout with quick actions and statistics
3. **Game Setup Screen**: Sequential cards for game configuration
4. **Active Game Screen**: Score-focused layout with prominent player indicators
5. **Statistics Screens**: Scrollable cards with data visualizations
6. **Profile & Settings**: List-based layout with toggles and form elements

## Core Components

### Navigation Components
- **Bottom Navigation Bar**: Fixed, 4 icons with labels, subtle highlight for active section
- **Back Button**: Positioned in header when navigation hierarchy is deeper than one level
- **Game Progress Indicator**: Horizontal pill showing active player and turn sequence

### Content Components
- **Game Cards**: Rounded corners, subtle drop shadow, clear headings
- **Player Selectors**: Avatar circles with name labels and checkboxes
- **Stat Cards**: Collapsible cards with summary view and expanded detail view
- **Action Buttons**: Prominent, pill-shaped with icon + text for primary actions
- **Score Display**: Large, high-contrast numbers with visual hierarchy (current score > remaining score)

### Input Components
- **Number Pad**: Large touch targets arranged in calculator-style grid
- **Simplified Dartboard**: Interactive visual dartboard with simplified sections
- **Quick Score Buttons**: Common scores (25, 50, etc.) as chips for fast entry
- **Toggle Switches**: For binary settings like dark/light mode
- **Player Form**: Streamlined input for adding friends

### Feedback Components
- **180 Celebration Overlay**: Fullscreen animation with incoming call visual
- **Toast Messages**: Subtle notifications for non-critical feedback
- **Checkout Suggestions**: Card that appears when player is within checkout range
- **Error Correction**: Slide-out panel for editing previous throws

## Interaction Patterns

### Navigation Patterns
- **Tab Switching**: Single tap on bottom navigation icons
- **History Navigation**: Back button or swipe gesture to return to previous screen
- **Context Menus**: Long press on items to reveal additional options
- **Game Flow**: Guided progression through setup > gameplay > results

### Input Patterns
- **Score Entry**: Two methods available:
  1. Number pad for quick entry (dominant pattern)
  2. Visual dartboard for precise sectional entry
- **Quick Actions**: Single tap on primary action buttons
- **Confirmations**: Two-step process for critical actions (game reset, account changes)
- **Error Correction**: 
  1. Immediate undo button for current turn
  2. Access to turn history with edit capability

### Feedback Patterns
- **Visual Feedback**: Color changes and subtle animations for successful actions
- **Haptic Feedback**: Optional vibration for score confirmation
- **Celebration Sequences**: 
  1. "180" button triggers incoming call animation
  2. Accepting call plays audio celebration
  3. Rejecting call cancels celebration

### Gestures
- **Swipe**: Navigate between related screens (game history, player stats)
- **Long Press**: Access contextual menus and additional options
- **Tap**: Primary interaction for buttons and controls
- **Pull to Refresh**: Update leaderboards and statistics

## Visual Design Elements & Color Scheme

### Color Palette
- **Primary Background**: Dark charcoal (#121212) as default
- **Card Background**: Slightly lighter (#1E1E1E) for contrast
- **Primary Accent**: Vibrant red (#E53935) for primary actions and highlights
- **Secondary Accents**: 
  - Green (#43A047) for success states and positive statistics
  - Amber (#FFB300) for warnings and notifications
  - Blue (#1E88E5) for information and interactive elements
- **Text Colors**: 
  - Primary: White (#FFFFFF) for high contrast
  - Secondary: Light gray (#B3B3B3) for supporting text
  - Disabled: Dark gray (#757575)

### Visual Hierarchy
- **Primary Content**: Large size, high contrast, prominent positioning
- **Secondary Content**: Medium size, medium contrast, supporting position
- **Tertiary Content**: Small size, lower contrast, peripheral positioning

### Visual Language
- **Cards**: Rounded corners (8dp radius), subtle elevation (2dp)
- **Buttons**: Pill-shaped for primary actions, rounded rectangles for secondary actions
- **Icons**: Simple, outlined style with consistent 24dp sizing
- **Dividers**: Subtle 1dp lines with 10% white (appearing as dark gray)
- **Celebrations**: Contained animations that don't interfere with core functionality

## Mobile, Web App, Desktop Considerations

### Mobile (Primary Focus)
- **Layout**: Single column layout optimized for portrait orientation
- **Touch Targets**: Minimum 48dp size for all interactive elements
- **Safe Areas**: Respects device notches and home indicators
- **Offline Support**: Local storage of game data with sync when connection available
- **Performance**: Optimized animations and transitions for lower-end devices

### Tablet/iPad
- **Layout**: Two-column layout in landscape orientation
  - Left column: Navigation and context
  - Right column: Primary content and actions
- **Split View**: Game view and statistics can display simultaneously in landscape
- **Touch Targets**: Same size as mobile for consistency

### Web App
- **Responsive Design**: Adapts from mobile to desktop layouts based on viewport
- **Keyboard Shortcuts**: Added for desktop users (number keys for score entry)
- **Hover States**: Additional visual feedback on interactive elements
- **Progressive Web App**: Installable with offline capabilities

### Desktop Considerations
- **Layout**: Multi-column layout utilizing additional screen space
  - Game area with score entry
  - Player statistics and history
  - Leaderboard
- **Window States**: Supports resizing and remembers user preference
- **Input Methods**: Optimized for mouse and keyboard
  - Number keys (1-9, 0) map to score entry
  - Arrow keys navigate between players
  - Spacebar for primary action

## Typography

### Font Family
- **Primary Font**: Roboto (system fallback to sans-serif)
- **Secondary Font**: Roboto Condensed for scores and numbers
- **Monospace**: Roboto Mono for specific numeric data (statistics)

### Type Scale
- **Display (Game Scores)**: 48px/3rem, Bold
- **Title (Screen Headers)**: 24px/1.5rem, Medium
- **Subtitle (Card Headers)**: 20px/1.25rem, Medium
- **Body (Primary Content)**: 16px/1rem, Regular
- **Caption (Supporting Text)**: 14px/0.875rem, Regular
- **Small (Tertiary Information)**: 12px/0.75rem, Regular

### Type Treatment
- **Line Height**: 1.5 for body text, 1.2 for headings
- **Letter Spacing**: -0.5px for large display text, normal for body text
- **Case Usage**: 
  - Title case for headers and buttons
  - Sentence case for body text and instructions
- **Font Weight**: 
  - Bold (700) for emphasis and primary information
  - Medium (500) for headers and subheadings
  - Regular (400) for body text

## Accessibility

### Color & Contrast
- **Contrast Ratios**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Color Independence**: Information never conveyed by color alone
- **Color Blindness**: Tested for all common types of color blindness
- **Light Mode Alternative**: High contrast light mode option with adjusted color palette

### Touch & Interaction
- **Touch Targets**: Minimum 48dp with adequate spacing
- **Error Prevention**: Confirmation for destructive actions
- **Recovery**: Easily accessible undo functionality
- **Alternative Input**: Support for external keyboards and assistive devices

### Content & Navigation
- **Screen Reader Support**: All UI elements properly labeled with ARIA attributes
- **Focus Indicators**: Visible focus states for keyboard navigation
- **Predictable Navigation**: Consistent patterns throughout the app
- **Reduced Motion**: Option to minimize animations for users with vestibular disorders

### Text & Readability
- **Scalable Text**: Supports system font size adjustments
- **Readability**: Maintains legibility in various lighting conditions
- **Simplicity**: Clear, concise language for instructions and labels
- **Information Density**: Appropriate spacing and grouping to prevent cognitive overload

### Additional Accessibility Features
- **Audio Feedback**: Optional sound effects with volume control
- **High Contrast Mode**: Enhanced contrast option beyond standard dark/light modes
- **Customization**: User preferences for animation speed and haptic feedback
- **Time-Based Elements**: Sufficient time provided for celebrations and notifications
