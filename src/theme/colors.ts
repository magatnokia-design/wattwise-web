export const colors = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#34D399',
  white: '#FFFFFF',
  background: '#F9FAFB',
  text: '#111827',
  textLight: '#6B7280',
  textDark: '#1F2937',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

export type Color = keyof typeof colors;