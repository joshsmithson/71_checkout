import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Globe, Skull, Check } from 'lucide-react';

// Game category definitions
interface GameVariant {
  value: string;
  label: string;
  description?: string;
}

interface GameCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  variants: GameVariant[];
  defaultVariant: string;
}

const GAME_CATEGORIES: GameCategory[] = [
  {
    id: 'traditional',
    name: 'Traditional',
    description: 'Classic countdown darts',
    icon: <Target size={32} />,
    color: '#1976d2', // blue
    variants: [
      { value: '301', label: '301' },
      { value: '501', label: '501' },
      { value: '701', label: '701' }
    ],
    defaultVariant: '501'
  },
  {
    id: 'atw',
    name: 'Around the World',
    description: 'Hit numbers in sequence',
    icon: <Globe size={32} />,
    color: '#2e7d32', // green
    variants: [
      { value: 'atw_1_20', label: '1-20' },
      { value: 'atw_1_20_bull', label: '1-20 + Bull' },
      { value: 'atw_1_20_25_bull', label: '1-20 + 25 + Bull' }
    ],
    defaultVariant: 'atw_1_20'
  },
  {
    id: 'killer',
    name: 'Killer',
    description: 'Last player standing wins',
    icon: <Skull size={32} />,
    color: '#d32f2f', // red
    variants: [
      { value: 'killer_3', label: '3 Lives' },
      { value: 'killer_5', label: '5 Lives' },
      { value: 'killer_7', label: '7 Lives' }
    ],
    defaultVariant: 'killer_3'
  }
];

// Find which category a game type belongs to
const getCategoryForGameType = (gameType: string): string | null => {
  for (const category of GAME_CATEGORIES) {
    if (category.variants.some(v => v.value === gameType)) {
      return category.id;
    }
  }
  return null;
};

interface GameTypeSelectorProps {
  value: string;
  onChange: (gameType: string) => void;
}

const GameTypeSelector: React.FC<GameTypeSelectorProps> = ({ value, onChange }) => {
  const selectedCategory = getCategoryForGameType(value);

  const handleCategoryClick = (category: GameCategory) => {
    if (selectedCategory === category.id) {
      // Already selected - do nothing (keep expanded)
      return;
    }
    // Select this category with its default variant
    onChange(category.defaultVariant);
  };

  const handleVariantClick = (variant: string) => {
    onChange(variant);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {GAME_CATEGORIES.map((category) => {
        const isSelected = selectedCategory === category.id;

        return (
          <motion.div
            key={category.id}
            layout
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <Box
              onClick={() => handleCategoryClick(category)}
              sx={{
                p: 2,
                borderRadius: '16px',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: isSelected ? category.color : 'divider',
                bgcolor: isSelected ? `${category.color}15` : 'background.paper',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: isSelected ? category.color : 'action.hover',
                  bgcolor: isSelected ? `${category.color}20` : 'action.hover'
                }
              }}
            >
              {/* Card Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* Icon */}
                <Box
                  sx={{
                    color: isSelected ? category.color : 'text.secondary',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s ease'
                  }}
                >
                  {category.icon}
                </Box>

                {/* Title and Description */}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    sx={{
                      color: isSelected ? category.color : 'text.primary',
                      transition: 'color 0.2s ease'
                    }}
                  >
                    {category.name}
                  </Typography>
                  <AnimatePresence mode="wait">
                    {isSelected ? (
                      <motion.div
                        key="description"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {category.description}
                        </Typography>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </Box>

                {/* Selection indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: category.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Check size={14} color="white" strokeWidth={3} />
                    </Box>
                  </motion.div>
                )}
              </Box>

              {/* Expanded Variant Selection */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1,
                        mt: 2,
                        flexWrap: 'wrap'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {category.variants.map((variant) => {
                        const isVariantSelected = value === variant.value;
                        return (
                          <Chip
                            key={variant.value}
                            label={variant.label}
                            onClick={() => handleVariantClick(variant.value)}
                            sx={{
                              fontWeight: isVariantSelected ? 'bold' : 'normal',
                              bgcolor: isVariantSelected ? category.color : 'action.selected',
                              color: isVariantSelected ? 'white' : 'text.primary',
                              borderRadius: '8px',
                              px: 1,
                              '&:hover': {
                                bgcolor: isVariantSelected
                                  ? category.color
                                  : 'action.hover'
                              }
                            }}
                          />
                        );
                      })}
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
          </motion.div>
        );
      })}
    </Box>
  );
};

export default GameTypeSelector;
