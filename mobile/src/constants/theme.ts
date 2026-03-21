export const colors = {
  primary: '#6C63FF',
  secondary: '#1E1E2E',
  accent: '#FF6B6B',
  surface: '#F8F9FA',
  muted: '#6B7280',
  white: '#FFFFFF',
  black: '#000000',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#E5E7EB',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  heading: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
} as const;

export interface Theme {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  success: string;
  warning: string;
  error: string;
  white: string;
  black: string;
}

export const lightTheme: Theme = {
  background: '#FFFFFF',
  card: '#F8F9FA',
  text: '#1E1E2E',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  surface: '#F8F9FA',
  primary: '#6C63FF',
  secondary: '#1E1E2E',
  accent: '#FF6B6B',
  muted: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  white: '#FFFFFF',
  black: '#000000',
};

export const darkTheme: Theme = {
  background: '#121212',
  card: '#1E1E2E',
  text: '#F8F9FA',
  textSecondary: '#9CA3AF',
  border: '#374151',
  surface: '#1E1E2E',
  primary: '#8B83FF',
  secondary: '#F8F9FA',
  accent: '#FF8A8A',
  muted: '#9CA3AF',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  white: '#FFFFFF',
  black: '#000000',
};
