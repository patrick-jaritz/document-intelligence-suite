/**
 * Prompt Builder Theme System
 * Provides 5 beautiful themes for the Prompt Builder
 */

export type PromptBuilderTheme = 'default' | 'darkSlate' | 'darkMidnight' | 'lightWarm' | 'lightCool';

export interface ThemeConfig {
  name: string;
  description: string;
  colors: {
    background: string;
    card: string;
    text: string;
    textMuted: string;
    border: string;
    primary: string;
    primaryHover: string;
    secondary: string;
    accent: string;
    inputBg: string;
    inputBorder: string;
    buttonPrimary: string;
    buttonPrimaryHover: string;
    buttonSecondary: string;
    previewBg: string;
    previewCodeBg: string;
  };
}

export const PROMPT_BUILDER_THEMES: Record<PromptBuilderTheme, ThemeConfig> = {
  default: {
    name: 'Default',
    description: 'Classic light theme with dark mode support',
    colors: {
      background: 'bg-white dark:bg-gray-900',
      card: 'bg-white dark:bg-gray-800',
      text: 'text-gray-900 dark:text-gray-100',
      textMuted: 'text-gray-600 dark:text-gray-400',
      border: 'border-gray-200 dark:border-gray-700',
      primary: 'text-blue-600 dark:text-blue-400',
      primaryHover: 'hover:text-blue-700 dark:hover:text-blue-300',
      secondary: 'text-gray-700 dark:text-gray-300',
      accent: 'text-orange-600 dark:text-orange-400',
      inputBg: 'bg-white dark:bg-gray-800',
      inputBorder: 'border-gray-300 dark:border-gray-600',
      buttonPrimary: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
      buttonPrimaryHover: 'hover:bg-blue-700 dark:hover:bg-blue-600',
      buttonSecondary: 'bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-700',
      previewBg: 'bg-gray-50 dark:bg-gray-900',
      previewCodeBg: 'bg-gray-100 dark:bg-gray-800',
    },
  },
  darkSlate: {
    name: 'Dark Slate',
    description: 'Professional blue-gray dark theme',
    colors: {
      background: 'bg-slate-900',
      card: 'bg-slate-800',
      text: 'text-slate-100',
      textMuted: 'text-slate-400',
      border: 'border-slate-700',
      primary: 'text-blue-400',
      primaryHover: 'hover:text-blue-300',
      secondary: 'text-slate-300',
      accent: 'text-orange-400',
      inputBg: 'bg-slate-800',
      inputBorder: 'border-slate-600',
      buttonPrimary: 'bg-blue-600 hover:bg-blue-500',
      buttonPrimaryHover: 'hover:bg-blue-500',
      buttonSecondary: 'bg-slate-700 hover:bg-slate-600',
      previewBg: 'bg-slate-950',
      previewCodeBg: 'bg-slate-900',
    },
  },
  darkMidnight: {
    name: 'Dark Midnight',
    description: 'Pure black theme for OLED displays',
    colors: {
      background: 'bg-black',
      card: 'bg-gray-950',
      text: 'text-gray-100',
      textMuted: 'text-gray-500',
      border: 'border-gray-800',
      primary: 'text-blue-400',
      primaryHover: 'hover:text-blue-300',
      secondary: 'text-gray-300',
      accent: 'text-orange-400',
      inputBg: 'bg-gray-950',
      inputBorder: 'border-gray-800',
      buttonPrimary: 'bg-blue-600 hover:bg-blue-500',
      buttonPrimaryHover: 'hover:bg-blue-500',
      buttonSecondary: 'bg-gray-900 hover:bg-gray-800',
      previewBg: 'bg-black',
      previewCodeBg: 'bg-gray-950',
    },
  },
  lightWarm: {
    name: 'Light Warm',
    description: 'Cozy amber-tinted light theme',
    colors: {
      background: 'bg-orange-50',
      card: 'bg-amber-50',
      text: 'text-orange-900',
      textMuted: 'text-orange-700',
      border: 'border-orange-200',
      primary: 'text-amber-700',
      primaryHover: 'hover:text-amber-800',
      secondary: 'text-orange-800',
      accent: 'text-orange-600',
      inputBg: 'bg-white',
      inputBorder: 'border-orange-300',
      buttonPrimary: 'bg-amber-600 hover:bg-amber-700',
      buttonPrimaryHover: 'hover:bg-amber-700',
      buttonSecondary: 'bg-orange-700 hover:bg-orange-800',
      previewBg: 'bg-orange-100',
      previewCodeBg: 'bg-amber-100',
    },
  },
  lightCool: {
    name: 'Light Cool',
    description: 'Fresh sky-blue light theme',
    colors: {
      background: 'bg-blue-50',
      card: 'bg-sky-50',
      text: 'text-blue-900',
      textMuted: 'text-blue-700',
      border: 'border-blue-200',
      primary: 'text-sky-700',
      primaryHover: 'hover:text-sky-800',
      secondary: 'text-blue-800',
      accent: 'text-blue-600',
      inputBg: 'bg-white',
      inputBorder: 'border-blue-300',
      buttonPrimary: 'bg-sky-600 hover:bg-sky-700',
      buttonPrimaryHover: 'hover:bg-sky-700',
      buttonSecondary: 'bg-blue-700 hover:bg-blue-800',
      previewBg: 'bg-blue-100',
      previewCodeBg: 'bg-sky-100',
    },
  },
};

/**
 * Get theme from localStorage or default
 */
export function getStoredTheme(): PromptBuilderTheme {
  if (typeof window === 'undefined') return 'default';
  const stored = localStorage.getItem('prompt-builder-theme');
  if (stored && stored in PROMPT_BUILDER_THEMES) {
    return stored as PromptBuilderTheme;
  }
  return 'default';
}

/**
 * Save theme to localStorage
 */
export function saveTheme(theme: PromptBuilderTheme): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('prompt-builder-theme', theme);
  }
}

/**
 * Apply theme classes to an element
 */
export function applyTheme(theme: PromptBuilderTheme, baseClasses: string): string {
  const themeConfig = PROMPT_BUILDER_THEMES[theme];
  
  // For themes that override dark mode, we need to apply classes conditionally
  // This is a simplified version - in practice, you'd use CSS variables or Tailwind's arbitrary variants
  return baseClasses;
}

