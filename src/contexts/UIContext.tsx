import { createContext, useContext, useState, ReactNode } from 'react';

interface UIContextType {
  isSoundEnabled: boolean;
  toggleSound: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  isHapticEnabled: boolean;
  toggleHaptic: () => void;
  showCelebration: () => void;
  hideCelebration: () => void;
  isCelebrationVisible: boolean;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  // Default to dark mode
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isHapticEnabled, setIsHapticEnabled] = useState(true);
  const [isCelebrationVisible, setIsCelebrationVisible] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const toggleSound = () => {
    setIsSoundEnabled((prev) => !prev);
  };

  const toggleHaptic = () => {
    setIsHapticEnabled((prev) => !prev);
  };

  const showCelebration = () => {
    if (isSoundEnabled) {
      // Play celebration sound - will implement later
    }
    setIsCelebrationVisible(true);
  };

  const hideCelebration = () => {
    setIsCelebrationVisible(false);
  };

  const value = {
    isSoundEnabled,
    toggleSound,
    isDarkMode,
    toggleTheme,
    isHapticEnabled,
    toggleHaptic,
    showCelebration,
    hideCelebration,
    isCelebrationVisible,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
} 