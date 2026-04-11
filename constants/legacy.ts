/** Legacy constants - kept for backward compatibility during migration */
export const COLORS = {
  primary: '#007BFF',
  secondary: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const API_ENDPOINTS = {
  baseURL: process.env['EXPO_PUBLIC_API_BASE_URL'] ?? '',
  users: '/users',
  posts: '/posts',
} as const;
