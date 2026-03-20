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
